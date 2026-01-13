# NPM Commands Reference

A comprehensive guide to all npm commands available in the iManage CRM project, organized by category for daily development workflow.

## Table of Contents

- [Development](#development)
- [Building](#building)
- [Testing](#testing)
- [Electron Development](#electron-development)
- [Electron Building](#electron-building)
- [Database & Data](#database--data)
- [Code Quality](#code-quality)
- [Production](#production)
- [Quick Reference](#quick-reference)

---

## Development

### Start Development Server
```bash
npm run dev
```
Starts both the API server and Next.js development server concurrently.  
**Use this for:** Daily development work on the web application.

### Start API Server Only
```bash
npm run api:dev
```
Starts only the Express API server using `tsx`.  
**Use this for:** Testing API endpoints independently or debugging server-side code.

### Start Electron Development
```bash
npm run electron:dev
```
Starts Next.js dev server and launches Electron app when ready.  
**Use this for:** Testing the Electron desktop application during development.

---

## Building

### Build Next.js Application
```bash
npm run build
```
Builds the Next.js application for production.  
**Use this for:** Creating production-ready static files.

### Build Static Export
```bash
npm run build:static
```
Builds Next.js as a static export (same as `build` in this project).  
**Use this for:** Static site generation.

### Build Server Code
```bash
npm run build:server
```
Compiles TypeScript server code to JavaScript in `dist-server/`.  
**Use this for:** Preparing server code for production or Electron builds.

### Build Electron Application
```bash
npm run build:electron
```
Builds the Electron application using the build script.  
**Use this for:** Preparing Electron-specific build artifacts.

### Build All (Server + Electron)
```bash
npm run build:all
```
Builds both server and Electron components.  
**Use this for:** Complete build before creating Electron distribution.

---

## Testing

### Run All Tests
```bash
npm test
```
Runs Jest unit tests.  
**Use this for:** Quick test validation during development.

### Run E2E Tests (Core)
```bash
npm run test:e2e
```
Runs Playwright end-to-end tests for core functionality.  
**Use this for:** Testing critical user flows.

### Run E2E Tests (Core) - Alternative
```bash
npm run test:e2e:core
```
Same as above, explicitly runs Core test project.  
**Use this for:** Same as `test:e2e`.

### Run E2E Tests (Extended)
```bash
npm run test:e2e:extended
```
Runs Playwright extended test suite.  
**Use this for:** Comprehensive testing including edge cases.

### Run E2E Tests with UI
```bash
npm run test:e2e:ui
```
Opens Playwright Test UI for interactive test running.  
**Use this for:** Debugging tests, watching test execution, and test development.

---

## Electron Development

### Start Electron in Development Mode
```bash
npm run electron:dev
```
Starts Next.js dev server and launches Electron app.  
**Use this for:** Daily Electron app development and testing.

---

## Electron Building

### Build Electron App (All Platforms)
```bash
npm run electron:build
```
Builds Electron app for all configured platforms.  
**Use this for:** Creating distribution packages for all platforms.

### Build Electron App (Windows)
```bash
npm run electron:build-win
```
Builds Windows installer (NSIS).  
**Use this for:** Creating Windows distribution package.

### Build Electron App (Windows - Unpacked)
```bash
npm run electron:build-win-unpacked
```
Builds Windows app without installer (unpacked directory).  
**Use this for:** Testing Windows build without creating installer, faster iteration.

### Build Electron App (macOS)
```bash
npm run electron:build-mac
```
Builds macOS DMG package.  
**Use this for:** Creating macOS distribution package.

### Build Electron App (Linux)
```bash
npm run electron:build-linux
```
Builds Linux AppImage package.  
**Use this for:** Creating Linux distribution package.

---

## Native Module Rebuild (better-sqlite3)

### Automatic Rebuild (Configured)

Native modules like `better-sqlite3` are automatically rebuilt for Electron's Node.js version during the build process. This is handled by electron-builder's `npmRebuild: true` configuration.

**How it works:**
- When you run any `electron:build-*` command, electron-builder automatically rebuilds native modules for Electron's Node.js version
- You'll see rebuild output in the console during the build process
- No manual steps required

**Configuration:**
- `npmRebuild: true` in `package.json` build config - enables automatic rebuild
- `asarUnpack: ["**/node_modules/better-sqlite3/**/*"]` - ensures native modules are unpacked from ASAR (required)

**System Requirements:**
- **Windows:** Visual Studio Build Tools with "Desktop development with C++" workload
- **macOS:** Xcode Command Line Tools
- **Linux:** build-essential package
- Python 3.x must be available in PATH (for node-gyp)

**Troubleshooting:**
If you encounter ABI mismatch errors (NODE_MODULE_VERSION mismatch), see `docs/ELECTRON_BUILD_ISSUES.md` Issue 4 for detailed solutions.

---

## Database & Data

### Populate Demo Data
```bash
npm run demo:populate
```
Populates the database with demo/test data.  
**Use this for:** Setting up test environment, demonstrating features, or resetting to known state.

### Delete Module Data (Debugging Tool)
```bash
npm run delete:module-data
```
Interactive script for selective deletion of database entries by module.  
**Use this for:** Cleaning up test data created during automation test runs, debugging, or resetting specific modules without affecting other data.

**Features:**
- Interactive menu to select which modules to delete
- Shows record counts before deletion
- Handles foreign key relationships automatically
- Requires confirmation before deletion
- Supports selective deletion (e.g., delete only quotations while keeping invoices)

**Available Modules:**
- Quotations (and quote items)
- Invoices (and invoice items)
- Purchase Orders (and PO items)
- Customers
- Vendors
- Vehicles (and vehicle transactions)
- Employees
- Payslips
- Vehicle Transactions
- Expense Categories (custom only)

**Note:** This is a debugging tool. Use with caution in production environments.

---

## Code Quality

### Run Linter
```bash
npm run lint
```
Runs ESLint to check code quality and style.  
**Use this for:** Ensuring code follows project standards before committing.

---

## Production

### Start Production Server
```bash
npm start
```
Starts Next.js production server.  
**Use this for:** Running the built application in production mode.

---

## Quick Reference

### Most Common Daily Commands

**Starting Development:**
```bash
npm run dev                    # Web app development
npm run electron:dev          # Electron app development
```

**Building:**
```bash
npm run build                 # Build Next.js app
npm run build:all             # Build everything for Electron
npm run electron:build-win    # Create Windows installer
```

**Testing:**
```bash
npm test                      # Unit tests
npm run test:e2e              # E2E tests (core)
npm run test:e2e:ui           # E2E tests with UI
```

**Code Quality:**
```bash
npm run lint                  # Check code style
```

### Pre-Build Hook

The `prebuild` script automatically runs before builds:
```bash
npm run prebuild              # Runs test-runner.js (automatically runs before build)
```

This ensures tests pass before building. It's automatically executed when you run `npm run build`.

---

## Command Dependencies

### Build Order for Electron Distribution

When creating an Electron distribution, follow this order:

1. **Build all components:**
   ```bash
   npm run build:all
   ```
   This runs:
   - `build:electron` - Electron build script
   - `build:server` - TypeScript server compilation

2. **Create distribution:**
   ```bash
   npm run electron:build-win    # or :mac, :linux
   ```

Alternatively, use the combined command:
```bash
npm run electron:build-win
```
This automatically runs `build:all` first.

---

## Environment Notes

- **Development:** Uses `NODE_ENV=development` for Electron dev mode
- **Production:** Uses `NODE_ENV=production` for builds
- **API Server:** Runs on default port (check `api/server.ts` for port configuration)
- **Next.js Dev:** Runs on `http://localhost:3000`
- **Electron:** Waits for Next.js server before launching

---

## Troubleshooting

### If builds fail:
1. Run `npm run build:all` separately to see specific errors
2. Check `dist-server/` for compilation errors
3. Ensure all dependencies are installed: `npm install`

### If Electron won't start:
1. Check if Next.js dev server is running on port 3000
2. Verify API server is accessible
3. Check Electron main process logs

### If tests fail:
1. Ensure database is initialized
2. Check test database configuration
3. Run `npm run test:e2e:ui` for interactive debugging

---

## Additional Notes

- All commands use npm scripts defined in `package.json`
- Some commands use `concurrently` to run multiple processes
- Electron builds require all dependencies to be installed
- Test commands use Playwright and Jest
- Build commands automatically run pre-build hooks

---

**Last Updated:** December 2024  
**Project:** iManage CRM System

