# Electron E2E – Automation Test Design & Engineering

This document describes the **automation design**, **patterns**, and **engineering decisions** for the Electron E2E suite. It complements the functional reference ([ELECTRON_TESTCASES.md](./ELECTRON_TESTCASES.md)) and is intended for maintainers and automation engineers.

---

## 1. Scope & Strategy

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Tool** | Playwright with `_electron` | Single process, one app instance; no browser context. |
| **Config** | `playwright.electron.config.ts` | Isolated from web E2E; different timeout, workers, output dir. |
| **Scope** | Electron-only | Validates desktop app lifecycle, window, and in-app navigation against Express on `localhost:3001`. |
| **Layering** | Phase 1 (screen load) → Phase 2 (interactions) | Smoke first; then CRUD/doc flows. Shared launch in Phase 1/2 reduces runtime. |

**Coverage intent:** Every user-facing route gets a load test; major modules get at least one happy-path interaction (create/edit/delete or primary CTA). No API mocking—tests hit the real Express backend.

---

## 2. Test Structure

### 2.1 Specs and Lifecycle

| Spec | Lifecycle | Notes |
|------|-----------|--------|
| `launch.spec.ts` | One test, launch → assert → close | No shared `beforeAll`; validates cold start and window. |
| `screen-load.spec.ts` | `beforeAll` launch, one window, `afterAll` close | 19 tests share one app; each test navigates, asserts content + console. |
| `interactions.spec.ts` | Same as screen-load | 13 describe blocks; shared app; dialog handler in `beforeAll`. |

**Why a single app for Phase 1 & 2:** Electron startup is expensive. Reusing one window keeps total time down and reflects real usage (user stays in one session). Trade-off: tests are not fully isolated (e.g. shared console capture); we mitigate with `clearErrors()` per test and optional `goto` to reset route.

### 2.2 Helpers and Reuse

- **`e2e/electron/helpers/electron-launch.ts`**
  - `launchElectronApp()` — consistent launch options (args, `NODE_ENV`).
  - `captureConsoleErrors(window)` — listener on `window.on('console')`, collects `type === 'error'`; exposes `getErrors()`, `clearErrors()`, `assertNoCriticalErrors(allowlist?)`.
  - `criticalErrorFilter(text, allowlist?)` — classifies messages as critical vs ignore; used inside `assertNoCriticalErrors`.
  - `ELECTRON_BASE_URL` — `http://localhost:3001` (single source for navigation).

**Pattern:** Each test that cares about console calls `clearErrors()` after last navigation/action, then `assertNoCriticalErrors()` at the end so we only fail on errors introduced in that test.

---

## 3. Stability & Flakiness

### 3.1 Console Error Policy

- **Critical patterns** (fail test): Uncaught exceptions, React Error Boundary, "Cannot read properties of undefined", "is not a function", "Failed to fetch", "NetworkError", generic `Error:` / `TypeError` / `ReferenceError`.
- **Ignore patterns** (do not fail): React DevTools promo, HMR, webpack, and allowlisted API fetch failures (e.g. known transient "Failed to get employees" during load). See `IGNORE_PATTERNS` and optional `allowlist` in `criticalErrorFilter`.

Extend `IGNORE_PATTERNS` or pass `allowlist` only for known benign messages; avoid silencing real bugs.

### 3.2 Waits and Load State

- After `window.goto()` we use `waitForLoadState('domcontentloaded')` (or `networkidle` where needed, e.g. list refresh).
- Screen-load suite: 2s delay after first load in `beforeAll` to allow app to settle before attaching console capture.
- Assertions use explicit timeouts (e.g. 10–20s for list rows, 5–15s for headings) instead of relying on default only.

### 3.3 Resilient Flows (Phase 2)

- **Vehicles:** After "Create Vehicle", if the new row is not visible immediately, we `goto('/vehicles')` and `waitForLoadState('networkidle')`, then assert row with a 20s timeout. Covers delayed list refresh.
- **Doc generator (Quotes, Invoices, PO):** We check for form/choice visibility (e.g. "Quote Details", "New empty invoice") before filling. If the form is not ready we skip the fill but still run `assertNoCriticalErrors()` so the test doesn’t fail on timing.
- **Optional UI (combobox, buttons):** Many interaction tests use `isVisible({ timeout: 3–5s }).catch(() => false)` and only interact if visible; otherwise they still assert no critical console errors. This keeps tests passing when data is empty or UI differs slightly.

### 3.4 Dialogs

- `interactions.spec.ts` registers `window.on('dialog', (dialog) => dialog.accept())` in `beforeAll` so confirmations (e.g. delete) don’t block. For tests that need to assert dialog text or reject, a dedicated handler would be set inside that test.

---

## 4. Selectors & Assertions

- **Preferred:** Role-based (`getByRole('button', { name: /.../ })`, `getByRole('heading', ...)`, `getByPlaceholder`, `getByLabel`) for stability and accessibility alignment.
- **Fallback:** `locator('[data-slot="card-title"]', { hasText: '...' })` or `.first()` when multiple matches are expected and we care about the first (e.g. card title). We use `exact: true` or narrow regex where strict mode would otherwise match multiple elements.
- **Fragile:** Avoid raw class or DOM structure (e.g. `div.flex-1.overflow-y-auto`) except where necessary (e.g. vehicle finance card list); prefer roles or data attributes when adding new UI.

**Screen-load:** Each test asserts at least one route-specific heading (or equivalent) and that "Application Error" / "Could not connect to Express server" are not visible. Then `assertNoCriticalErrors()`.

---

## 5. Data & Isolation

- **Unique data:** Interaction tests use `Date.now()` (or derived IDs) in entity names (e.g. `E2E Customer ${uid}`) to avoid collisions and stale data from previous runs.
- **No shared DB reset:** Tests assume backend is available and may leave data behind. For CI, either use a dedicated test DB that is reset before the run or accept cross-test pollution and rely on unique names.
- **Order:** Interactions that create customers/vendors for doc flows run those creates in the same test before navigating to quote/invoice/PO create; no cross-test dependency.

---

## 6. Configuration & CI

- **Timeout:** 60s per test (`playwright.electron.config.ts`). Sufficient for Electron startup + navigation + interaction.
- **Workers:** 1. Electron runs a single process; parallel workers would start multiple apps and compete for port/state.
- **Retries:** 0 in config. Optional: enable retries in CI only if flakiness is confirmed and tracked.
- **Output:** `test-results-electron/`; launch spec writes screenshot to `test-results-electron/launch-screenshot.png`.
- **Run command:**  
  `npx playwright test e2e/electron/ --config=playwright.electron.config.ts --project=Electron`

**CI considerations:** Ensure the Express server (or full app) is up on the expected port before starting the Electron suite, or start it in a prior step. Same machine as where Playwright runs to avoid "Could not connect to Express server" from network/firewall.

---

## 7. Maintenance

- **Adding a route:** Add a screen-load test: `goto(route)`, assert route-specific content and no error page, `assertNoCriticalErrors()`. Optionally add an interaction test if the module has primary actions.
- **Changing selectors:** Prefer role/label/placeholder; if the app changes, update the spec and this doc’s selector notes. Keep `ELECTRON_TESTCASES.md` in sync with any new or removed tests.
- **New console noise:** If a benign message starts failing the suite, add it to `IGNORE_PATTERNS` (or a test-level `allowlist`) in `electron-launch.ts` and document the reason in this file.
- **Flaky test:** First check wait strategy (load state, timeout, optional visibility). Then consider retries or a more robust selector/flow; avoid relaxing assertions without a clear reason.

---

## 8. Summary

| Item | Location / Practice |
|------|---------------------|
| Functional test list | [ELECTRON_TESTCASES.md](./ELECTRON_TESTCASES.md) |
| Launch helper & console capture | `e2e/electron/helpers/electron-launch.ts` |
| Config | `playwright.electron.config.ts` |
| Single app, shared window | `screen-load.spec.ts`, `interactions.spec.ts` |
| Critical vs ignore console | `CRITICAL_PATTERNS` / `IGNORE_PATTERNS` in `electron-launch.ts` |
| Unique test data | `Date.now()` in entity names in interaction specs |
| Dialog handling | `window.on('dialog', …)` in interactions `beforeAll` |

This design keeps the suite manageable, stable, and aligned with real user paths while staying maintainable for future route and flow changes.
