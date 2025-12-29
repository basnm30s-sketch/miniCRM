# Electron Server Spawn Fixes

**Date**: December 29, 2025  
**Affected**: Packaged Electron app (production builds)  
**Symptoms**: "Application Error - Could not connect to Express server"

---

## Quick Summary

The packaged Electron app failed to start its embedded Express API server. Three distinct issues were identified and fixed.

---

## Issues & Fixes

| # | Issue | Root Cause | Fix |
|---|-------|------------|-----|
| 1 | **ENOENT spawn error** | `spawn()` failed because CWD was set to an ASAR archive path (`app.asar`), which isn't a real filesystem directory | Changed CWD to `path.dirname(process.execPath)` and enabled `shell: true` on Windows |
| 2 | **Express 5 route crash** | Express 5's `path-to-regexp` rejects `*` wildcards without named parameters | Changed `app.get('*', ...)` to `app.get('/{*splat}', ...)` |
| 3 | **Frontend 404 errors** | Server looked for `out/` inside `dist-server/` instead of app root | Changed path from `path.join(__dirname, '..', 'out')` to `path.join(__dirname, '..', '..', 'out')` |

---

## Detailed Analysis

### Issue 1: ENOENT Spawn Error

**Error Message**:
```
Error: spawn C:\...\iManage.exe ENOENT
CWD: C:\...\resources\app.asar
```

**Why It Happened**:
- In packaged Electron apps, `app.getAppPath()` returns a path inside the ASAR archive
- ASAR is a virtual filesystem—`spawn()` cannot use it as a working directory
- Windows requires `shell: true` for reliable process spawning in this context

**Code Change** (`electron/main.js`):
```javascript
// Before
const cwd = isPackaged ? app.getAppPath() : path.join(__dirname, '..');

// After
if (useNode) {
  cwd = path.dirname(process.execPath);  // Real directory
} else {
  cwd = path.join(__dirname, '..');
}

// Spawn options
spawn(command, args, {
  cwd,
  env,
  shell: process.platform === 'win32' && isPackaged,  // Enable shell on Windows
  windowsHide: true,
});
```

---

### Issue 2: Express 5 Route Syntax

**Error Message**:
```
PathError [TypeError]: Missing parameter name at index 1: *
originalPath: '*'
```

**Why It Happened**:
- Express 5 upgraded `path-to-regexp` from v1 to v8
- The `*` wildcard syntax is no longer valid
- Named parameters are now required for wildcards

**Code Change** (`api/server.ts`):
```typescript
// Before (Express 4 syntax)
app.get('*', (req, res, next) => { ... });

// After (Express 5 syntax)
app.get('/{*splat}', (req, res, next) => { ... });
```

**Reference**: https://git.new/pathToRegexpError

---

### Issue 3: Frontend Path Resolution

**Error Message**:
```
ENOENT: dist-server\out\index.html not found in app.asar
```

**Why It Happened**:
- Server runs from `dist-server/api/server.js`
- `__dirname` is `dist-server/api/`
- `path.join(__dirname, '..', 'out')` resolves to `dist-server/out/` (wrong)
- Actual location is `out/` at the app root (two levels up)

**Code Change** (`api/server.ts`):
```typescript
// Before
const frontendPath = path.join(__dirname, '..', 'out');

// After
const frontendPath = path.join(__dirname, '..', '..', 'out');
```

---

## Verification

After fixes, the terminal logs show successful startup:

```
✓ API server process spawned, PID: 6644
✓ Database initialized successfully
✓ API server running on http://localhost:3001
✓ Successfully loaded from server
```

---

## Files Modified

| File | Changes |
|------|---------|
| `electron/main.js` | CWD calculation, spawn options |
| `api/server.ts` | Route syntax, frontend path |

---

## Rebuild Commands

```powershell
# Rebuild server code
npm run build:server

# Rebuild Electron app (unpacked for testing)
npx electron-builder --win --dir

# Full installer build
npm run electron:build-win
```

---

## Key Learnings

1. **ASAR is virtual**: Never use ASAR paths for filesystem operations like `spawn()` CWD
2. **Express 5 breaking changes**: Route syntax changed significantly—check migration guide
3. **Path debugging**: Always log resolved paths to verify they point where expected
4. **Run from terminal**: Launch Electron apps from terminal to see main process logs


