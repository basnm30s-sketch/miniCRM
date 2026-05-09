# Fix: Settings Save Timeout + React 418

## Symptoms

- Clicking **Save Settings** behaved inconsistently:
  - First click after opening the Settings page: success.
  - Subsequent clicks: `Failed to save admin settings: Error: Request timeout` and
    `Failed to save settings: Error: Request timeout`.
- Console also showed `Uncaught Error: Minified React error #418`
  (`react.dev/errors/418?args[]=HTML`) at app load time, before any user interaction.

## Root Cause Analysis

### 1) Repeated saves timing out

Three layers contributed:

1. **Hot-path schema migrations.** `adminAdapter.get()` and `adminAdapter.save()`
   in `api/adapters/sqlite.ts` were running `PRAGMA table_info(admin_settings)`
   + `ALTER TABLE` checks on every single GET/POST. After the first save, the
   `adminSettingsUpdated` event triggers multiple consumers to refetch settings,
   and each refetch ran the migration loop again, increasing pressure on the
   single-threaded `better-sqlite3` event loop.
2. **No SQLite concurrency hardening.** The DB connection used the default
   `journal_mode = DELETE` and no `busy_timeout`. On Windows, the journal-file
   create/delete cycle plus AV/file-system latency can briefly hold the DB
   file lock, causing intermittent stalls on the next write.
3. **Strict global 8s timeout.** `lib/api-client.ts` used a single 8s timeout
   for every request, so any one of the above stalls flipped a successful
   write into a client-side `Request timeout`.

### 2) React 418 hydration mismatch (HTML element)

`components/layout-wrapper.tsx` initialized `sidebarExpanded` with a lazy
`useState` initializer that branched on `window.innerWidth`:

```tsx
const [sidebarExpanded, setSidebarExpanded] = useState(() => {
  if (typeof window !== 'undefined') {
    return window.innerWidth >= 768
  }
  return true
})
```

During the Next.js static export, `window` is undefined, so the prerendered
HTML always reflected the desktop (expanded) layout. On client hydration,
if the actual window was below 768px, the lazy initializer returned `false`
and React reconciled a different DOM tree. With the layout wrapper at the
root of every page (just under `<html>` / `<body>`), React reported the first
mismatched ancestor as `HTML`, producing the minified error
`#418` with `args[]=HTML`.

A secondary risk for the same error existed in
`components/doc-generator/two-pane/DocGeneratorNotesTermsSection.tsx`, which
renders `terms` HTML via `dangerouslySetInnerHTML`. If terms content ever
contained full-document wrappers (`<html>`, `<head>`, `<body>`), the same
class of mismatch could surface on quotation/invoice/PO detail panes.

## Fixes Applied

### 1) Move admin settings migrations out of hot path

- Removed per-request migration checks in
  `api/adapters/sqlite.ts` (`adminAdapter.get`, `adminAdapter.save`).
- Expanded startup migration list in `lib/database.ts` to include all
  admin-settings columns the adapter expects, so the schema is prepared once
  at server startup.

### 2) Harden better-sqlite3 concurrency

- In `lib/database.ts`, after `db = new Database(...)`:

  ```ts
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('busy_timeout = 5000')
  ```

- WAL eliminates DELETE-mode journal-file churn and lets readers proceed
  while a single writer commits. `busy_timeout = 5000` lets a contended
  write wait briefly instead of erroring/hanging out under brief Windows
  file-lock contention.

### 3) Endpoint-aware client timeout + abort-on-replay

- `lib/api-client.ts`:
  - `apiRequest` now accepts an optional `timeoutMs` and falls back to the
    8s default for everything else.
  - `saveAdminSettings` now uses a dedicated 20s timeout via
    `AbortController` (so it composes cleanly with the in-flight abort
    described below).
  - A module-level `lastAdminSaveAbort` aborts a previous in-flight save if
    a new save is started, preventing duplicate writes from rapid clicks.

### 4) Server-side single-flight for admin save

- `api/routes/admin.ts` wraps `POST /settings` and `PUT /settings` in a
  `runSerializedSave` helper that serializes overlapping save attempts.
  Since `better-sqlite3` is synchronous and any other queued requests
  share the Node event loop, this guarantees deterministic ordering and
  surfaces meaningful errors instead of opaque timeouts.

### 5) Fix React 418 root cause

- `components/layout-wrapper.tsx`:
  - `sidebarExpanded` now defaults to `true` for both SSR and the first
    client render (matching the prerendered HTML).
  - A `hasMounted` guard runs after mount and only then reads
    `window.innerWidth` / `isMobile` to flip the sidebar state, so React
    has already finished hydration with matching markup.

### 6) Defensive HTML normalization for terms

- Added `lib/html-normalizer.ts` with `normalizeRichTextHtml` /
  `normalizeOptionalRichTextHtml`, which strip `<!doctype>`, `<html>`,
  `<head>`, and unwrap `<body>` to fragment-safe HTML.
- Applied at write-time in `app/admin/page.tsx` and `api/adapters/sqlite.ts`,
  and at render-time in
  `components/doc-generator/two-pane/DocGeneratorNotesTermsSection.tsx`.

### 7) UX hardening + instrumentation

- `app/admin/page.tsx`:
  - Save button is guarded against duplicate concurrent submissions.
  - Toast on failure now distinguishes timeouts (suggesting a retry) from
    other errors.
- Client and server now log `[AdminSettings]` timing + payload size for
  every save, enabling fast triage if a regression resurfaces.

## Files Changed

- `app/admin/page.tsx`
- `api/routes/admin.ts`
- `api/adapters/sqlite.ts`
- `lib/api-client.ts`
- `lib/database.ts`
- `lib/html-normalizer.ts`
- `components/layout-wrapper.tsx`
- `components/doc-generator/two-pane/DocGeneratorNotesTermsSection.tsx`

## Verification

- Lint diagnostics: clean for all touched files.
- Jest:
  - `npm test -- admin --runInBand` (`api/__tests__/admin.test.ts`) passed.
  - `npm test -- --testPathPattern="lib/__tests__" --runInBand` (21 suites,
    238 tests) passed.

## Notes for Rebuilds

After pulling these changes, rebuild the Electron app so both the Next.js
static export and the compiled `dist-server/` pick up the fixes:

```bash
npm run build:all
npm run electron:build-win
```

Without the rebuild, the renderer keeps using the previously cached
`out/_next/static/chunks/*.js` bundle (which still contains the old
hydration-unsafe layout wrapper).
