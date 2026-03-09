# Teaching Guide: iManage (miniCRM)

Role: Senior developer + CS professor
Audience: Computer Science student
Goal: Understand how the app works end-to-end, how events flow, and how to think about designing a system like this. Also identify alternative/better ways to build it.

---

## 1) What this application is (big picture)

This is a desktop CRM for a transportation/maintenance business. It is built as an Electron app with:

- A **local Express API** for data access and file uploads.
- A **Next.js frontend** that runs as a static site served by the Express server.
- **SQLite** for persistence (with fallback to client-side storage when SQLite is unavailable).

Think of it as a three-layer system that happens to ship together on the user’s computer:

1) **Renderer (UI)**: Next.js + React (everything under `app/`, `components/`, `hooks/`).
2) **Local API**: Express server (`api/server.ts`) that exposes routes for CRUD.
3) **Data layer**: SQLite (`lib/database.ts`) and adapters (`api/adapters/sqlite`).

Electron (`electron/main.js`) orchestrates these layers: it boots the API server and then loads the UI at `http://localhost:3001`.

---

## 2) Architecture in one diagram (mental model)

```
User actions
   ↓
React UI (Next.js App Router)
   ↓
React Query hooks + API client
   ↓
HTTP to Express API (localhost:3001)
   ↓
SQLite adapters → SQLite database file
   ↓
JSON response → React Query cache → UI update
```

This is classic three-tier architecture, but packaged locally in Electron.

---

## 3) Application lifecycle and core events

### 3.1 Electron startup

The Electron main process is responsible for starting the API server and opening the UI window. It also includes health checks and crash handling.

Key behaviors:
- Spawn Express server with environment variables for `DB_PATH` and `IMANAGE_DATA_DIR`.
- Retry/health check the API.
- Load the UI from `http://localhost:3001`.

Code references:
```
268:344:electron/main.js
// API start + env injection + health monitoring
```
```
462:621:electron/main.js
// Create window and load URL with retry logic
```

Design lesson: a desktop app can still use a web server internally to simplify the app architecture. This avoids IPC complexity and keeps the frontend identical to a web deployment.

### 3.2 Express server boot

The Express server is the API and static-file host. It:
- Initializes the database (`initDatabase()`).
- Serves the Next.js static export from `out/`.
- Mounts REST routes for all entities.
- Implements a SPA catch-all route for client routing.

Code reference:
```
34:150:api/server.ts
// Middleware, database init, static files, API routes, SPA catch-all
```

Design lesson: a SPA catch-all route is required when you serve a client-side routed app from Express. Without it, `/customers` would 404 on refresh.

### 3.3 Frontend boot

The root layout wires global providers:
- React Query for server state caching.
- Error Boundary for runtime errors.
- Layout wrapper for sidebar + main content.

Code reference:
```
36:52:app/layout.tsx
// Providers and layout wrapper
```

---

## 4) Event-driven data flow (how “events” work here)

There are two main event channels in this app:

### 4.1 React Query invalidation (server state)

The standard pattern is:
- UI calls mutation hook (create/update/delete).
- Mutation triggers invalidation of the relevant query key.
- Query refetches, UI updates.

Example for Customers:
```
13:77:hooks/use-customers.ts
// useQuery + useMutation + invalidateQueries
```

### 4.2 Custom browser events (cross-component invalidation)

Some pages dispatch `window` events so unrelated components can refresh.

- `adminSettingsUpdated` refreshes settings and sidebar controls.
- `dataUpdated` invalidates data for a specific entity.

Event bridge implementation:
```
6:52:lib/providers/query-provider.tsx
// window.addEventListener('adminSettingsUpdated' / 'dataUpdated')
```

Where these events are fired:
```
114:150:app/customers/page.tsx
// window.dispatchEvent(new CustomEvent('dataUpdated', { entity: 'customers' }))
```

Design lesson: this is a lightweight global event bus. It is convenient, but can scale poorly if events become complex. A centralized state manager or event framework might be cleaner in bigger apps.

---

## 5) Deep dive: Example flow (Customer CRUD)

### Step-by-step

1) User clicks “Add Customer”
2) UI validates input in `CustomersPage`.
3) `useCreateCustomer` executes `saveCustomer` in `lib/api-client.ts`.
4) API client sends `POST /api/customers`.
5) Express route calls SQLite adapter to create customer.
6) Response returns → mutation resolves → invalidates `customers` query.
7) React Query refetches `/api/customers` and UI updates.

Relevant code:
```
14:134:app/customers/page.tsx
// UI form handling + event dispatch
```
```
23:56:api/routes/customers.ts
// Express CRUD handlers
```

What to learn:
- Validation is done client-side (in UI).
- The API layer is thin: it mainly delegates to adapters.
- Query invalidation ensures consistency without manual state updates.

---

## 6) Data model and persistence

The database schema is defined in `lib/database.ts`.

Key observations:
- Each entity is stored in its own table: customers, vendors, employees, vehicles, quotes, purchase orders, invoices, etc.
- Foreign keys enforce relationships (e.g., invoices → customers).
- There are many “migration” blocks that add columns if missing. This is a lightweight migration strategy.

Code reference:
```
104:720:lib/database.ts
// Table creation + migration + indexes
```

Design lesson: lightweight migrations are practical for small desktop apps, but at scale you would use a proper migration system (like Prisma Migrate or Drizzle).

---

## 7) UI layer: navigation and layout

The layout uses a sidebar and an adaptive layout wrapper. The sidebar uses `adminSettings` to show/hide some links and listens for updates.

Key files:
- `components/layout-wrapper.tsx` (responsive sidebar, ESC to collapse)
- `components/sidebar.tsx` (navigation structure, settings-driven behavior)

Code references:
```
9:82:components/layout-wrapper.tsx
// Sidebar behavior + layout container
```
```
102:552:components/sidebar.tsx
// Navigation + settings-driven UI
```

Design lesson: keep navigation logic centralized, not duplicated across pages.

---

## 8) Error handling and resilience

### 8.1 UI error boundary

React error boundary catches render errors and sends them to Electron via IPC:
```
37:63:components/error-boundary.tsx
// Error logging via electronAPI.invoke('log-error', ...)
```

### 8.2 Electron crash handling

Electron listens to renderer crashes and logs to files:
```
509:548:electron/main.js
// render-process-gone + auto reload
```

Design lesson: desktop apps need resilience. Users expect the app not to "die" without a clear message.

---

## 9) Document generation

The system generates PDFs, Word, and Excel files via:
- `lib/pdf.ts`
- `lib/docx.ts`
- `lib/excel.ts`

This is a typical business requirement: build documents from stored data and static branding assets.

---

## 10) How to think about designing apps like this

As a student, focus on **separation of concerns**:

- **UI concerns**: forms, validation, navigation, user feedback.
- **Data access concerns**: API client, retries, error handling.
- **Domain logic**: how quotes become invoices, how finances are computed.
- **Persistence**: schema, migrations, indices, data integrity.
- **Packaging**: deployment and offline behavior (Electron).

Ask yourself:
- What is the core data model?
- Which workflows are critical (create/update, convert, report)?
- Which operations must be safe (deletes with references)?
- What fails when the server is down?

---

## 11) “Better ways” and alternative designs

This app is solid for a single-user desktop CRM. But if you needed multi-user or scalability, consider:

### 11.1 Backend architecture
- **Current:** Local Express server with SQLite.
- **Alternative:** Remote API (Node + Postgres) with authentication and multi-user support.

### 11.2 State management
- **Current:** React Query + custom events.
- **Alternative:** A dedicated global state layer (Zustand/Redux) or a typed event bus.

### 11.3 Database migrations
- **Current:** Manual `ALTER TABLE` blocks.
- **Alternative:** Schema migration tool (Prisma/Drizzle) with versioned migrations.

### 11.4 Security model
- **Current:** No auth (local desktop).
- **Alternative:** Auth + role-based access for enterprise use.

### 11.5 API contract and types
- **Current:** Shared TypeScript types + ad-hoc validation.
- **Alternative:** OpenAPI or tRPC for end-to-end typing and validation.

### 11.6 File storage
- **Current:** Local disk with simple paths.
- **Alternative:** Object storage service (S3/MinIO) or encrypted storage.

---

## 12) Suggested learning exercises (to internalize design)

1) Add a new entity (e.g., “Contracts”) end-to-end:
   - DB schema, route, API client, hooks, and UI page.
2) Add a validation rule in UI and server.
3) Add a new report page that aggregates invoices by month.
4) Implement a migration with a version table.
5) Add a simple role system (admin vs user).

---

## 13) Where to explore next

There is already strong documentation in `docs/`:
- `docs/CURRENT_STATE.md` for a complete feature overview.
- `docs/ARCHITECTURE.md` for a deeper structural explanation.
- `docs/MODULES_STRUCTURE.md` for UI and module consistency.

Use those as your map. This guide is your lecture notes.

---

If you want, I can walk you through a specific module (quotes, invoices, payslips, vehicle finances) line by line and explain its event flow and design tradeoffs.
