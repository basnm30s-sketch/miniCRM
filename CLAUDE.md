# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

iManage — a Car Rental CRM (customers, vendors, employees, vehicles, quotes, purchase orders, invoices, payslips, vehicle profitability/finances). Ships as a desktop app (Electron + Next.js + Express + SQLite) and can also deploy to Vercel using Next.js API routes instead of Express. `iManageCRM.NET/` at the repo root is an unrelated, separate .NET rewrite attempt — do not confuse it with the active Node/Next.js codebase described below.

## Commands

```bash
npm run dev                 # Next.js (port 3000) + Express API (port 3001), concurrently
npm run api:dev              # Express API server only (tsx api/server.ts)
npm run dev:clean            # clears .next/dev caches, then npm run dev

npm run lint                 # eslint .

npm test                     # jest (unit/API tests)
npx jest path/to/file.test.ts               # run a single test file
npx jest -t "test name"                     # run tests matching a name
npm run test:e2e             # playwright, project "Core" (e2e/core)
npm run test:e2e:extended    # playwright, project "Extended" (e2e/extended)
npx playwright test e2e/core/customers.spec.ts   # single e2e spec
npm run test:e2e:ui          # playwright UI mode
npm run test:electron        # playwright against packaged Electron app (e2e/electron), uses playwright.electron.config.ts

npm run build:electron       # full Electron build: static export + server compile + electron-builder
npm run electron:build-win   # Windows installer build
npm run electron:dev         # Electron shell against the Next dev server
npm run build                # next build (Vercel-style, keeps API routes)
```

Jest tests that touch the DB expect `data/crm_test.db`; use `DB_FILENAME=crm_test.db` and `scripts/init-test-db.ts` to reset it. Most API route tests instead mock `api/adapters/sqlite` with `jest.mock`, so they don't need a real DB (see `api/__tests__/customers.test.ts`).

## Architecture

There are **two interchangeable backends** sharing one adapter layer, selected by build target:

- **Electron/desktop** (`npm run dev`, `electron:*`): Express server (`api/server.ts`, port 3001) with routes in `api/routes/*.ts`. In dev, `next.config.mjs` rewrites `/api/*` to `http://localhost:3001/api/*`. In production Electron, `electron/main.js` spawns the compiled Express server as a child process and loads the app from `http://localhost:3001` (never `file://`), so the frontend is a Next.js **static export** (`NEXT_EXPORT=true next build` → `out/`) served by Express as static files.
- **Vercel/serverless**: a single catch-all Next.js route, `app/api/[...route]/route.ts`, reimplements the same REST surface as one function (kept to one handler to stay under Vercel's function-count limit). It duplicates routing logic that lives in `api/routes/*` for Express — when changing an endpoint's behavior, check whether it needs updating in **both** places. `app/api/vehicle-finances/dashboard/route.ts` is a standalone Next.js route used the same way.

Both backends call into the same data layer:
- `api/adapters/sqlite.ts` — CRUD "adapters" per entity (`customersAdapter`, `invoicesAdapter`, etc.), written as raw SQL via `better-sqlite3`, not through an ORM. Includes ad hoc migration helpers (e.g. `ensureTermsColumns`) that `ALTER TABLE` on startup for older DBs.
- `lib/database.ts` — opens/creates the SQLite file, sets `WAL`/`busy_timeout` pragmas, defines `createTables`. This is the actual runtime schema source.
- `lib/db-config.ts` — resolves the DB file path: `DB_PATH`/`DB_FILENAME` env override → Electron `userData` dir (when `electron.app` is available) → `<cwd>/data`.

There is a **second, parallel data-access path** using Drizzle ORM: `src/db/schema.ts` (schema) + `src/db/index.ts` (connection) + `actions/*.ts` (Next.js Server Actions, `'use server'`). Despite existing side-by-side, `lib/types.ts` derives its exported types (`Customer`, `Invoice`, etc.) from the Drizzle schema via `InferSelectModel`, so the Drizzle schema is the canonical type definition even though the live Express/adapter path talks to SQLite directly with hand-written SQL. Keep `src/db/schema.ts` and the `CREATE TABLE` statements in `lib/database.ts` in sync when changing columns.

Frontend data flow: page/component → React Query hook in `hooks/use-*.ts` → `lib/api-client.ts` (fetch wrapper with timeouts/health-check/retry against `/api` or `NEXT_PUBLIC_API_URL`) → whichever backend is active. `lib/storage-adapter.ts`/`lib/storage.ts` are a legacy localStorage fallback path, kept for when no DB/API is reachable.

Document generation (`lib/pdf.ts`, `lib/docx.ts`, `lib/excel.ts`, `lib/doc-generator/`) runs **client-side**: it fetches entity + admin-settings + branding (logo/seal/signature) data from the API, then builds the PDF (html2canvas + jsPDF), DOCX (`docx` lib), or Excel (`exceljs`) in the browser and triggers a download. There's no server-side rendering of documents.

File uploads (`api/routes/uploads.ts`, `api/services/file-storage.ts`) write to `data/uploads/` (documents, UUID-named) and `data/branding/` (logo/seal/signature, fixed names) — both under the resolved data dir from `lib/db-config.ts`, i.e. Electron's `userData/data` in production.

Quotes, Purchase Orders and Invoices are intentionally structured as parallel, near-identical modules (own route, own page under `app/quotes|purchase-orders|invoices`, own line-items table, own PDF/DOCX/Excel renderer) rather than a shared abstraction — see `docs/MODULES_STRUCTURE.md` for the exact per-module field/layout differences. Quotes and POs can convert into an Invoice (`quoteId`/`purchaseOrderId` FKs on `invoices`).

`app/admin` settings (`admin_settings` table/`useAdminSettings`) control feature toggles referenced throughout the dashboard (e.g. `showRevenueTrend`, `showQuotationsTwoPane`) — check there before assuming a dashboard section is always rendered.

## Electron process model

`electron/main.js` is defensive about the Express child process lifecycle: it tracks the server's real PID (parsed from its stdout banner, since `shell: true` on Windows makes the spawned PID a `cmd.exe` wrapper), writes a PID file to detect orphaned servers from crashed previous runs, runs a health-check poll that restarts the server after repeated failures, and force-kills the process tree (`taskkill /T /F` on Windows) before quitting. If you touch server startup/shutdown, preserve this ordering (kill tree before `child.kill()`, `event.preventDefault()` in `before-quit` to await async cleanup).
