# Electron Build Issues and Pre-Conditions

## Overview

This document comprehensively covers all known issues encountered during Electron build generation for the iManage application, along with their solutions and an exhaustive pre-conditions checklist to ensure successful builds.

## Build Process Overview

The Electron build process consists of several steps:

1. **Next.js Static Export** - Builds the frontend as static files (required because Electron uses static export, not Next.js API routes)
2. **TypeScript Server Compilation** - Compiles the Express API server from TypeScript to JavaScript
3. **Native Module Rebuild** - Rebuilds native modules (like `better-sqlite3`) for Electron's Node.js version
4. **Electron Packaging** - Packages everything into a distributable installer using electron-builder

**Key Files:**
- `scripts/build-electron.js` - Handles Next.js static export with API folder backup/restore
- `api/server.ts` - Express server that serves static files and API routes in Electron
- `next.config.mjs` - Next.js configuration (uses `output: 'export'` for Electron builds)
- `package.json` - Contains build scripts and electron-builder configuration

---

## Common Issues and Solutions

### Issue 1: Static Assets Served as HTML

**Symptoms:**
- Console error: `Uncaught SyntaxError: Unexpected token '<'`
- Image files return 404: `logo.png:1 Failed to load resource: the server responded with a status of 404 (Not Found)`
- JavaScript files fail to load or execute
- CSS files not applying styles

**Root Cause:**
The Express catch-all route in `api/server.ts` was serving `index.html` for ALL non-API routes, including static assets like JavaScript files, CSS files, and images. This caused:
- JavaScript files to be served as HTML (hence the "Unexpected token '<'" error)
- Image files to return 404 because they were being served as `index.html` instead of the actual file

**Solution:**
Updated the catch-all route in `api/server.ts` to:
1. Skip static file extensions (`.js`, `.css`, `.png`, `.jpg`, etc.)
2. Check if the requested file exists before serving `index.html`
3. Only serve `index.html` for actual SPA routes (like `/customers`, `/dashboard`)

**Code Location:** `api/server.ts` lines 92-124

**Prevention:**
- Always ensure static middleware is configured before catch-all routes
- Test that static assets load correctly after any server route changes
- Verify MIME types are set correctly for different file types

---

### Issue 2: Windows Build Script - cross-env Not Found

**Symptoms:**
- Build fails with: `'cross-env' is not recognized as an internal or external command`
- Error occurs during `npm run build:electron` step
- Next.js build never starts

**Root Cause:**
On Windows, the `cross-env` package may not be in PATH when executed from Node.js scripts, or the command syntax doesn't work correctly in Windows PowerShell/CMD.

**Solution:**
Updated `scripts/build-electron.js` to:
1. Use `npm run build` instead of calling `next` directly
2. Set `NEXT_EXPORT` environment variable in the `env` object passed to `execSync`
3. Use platform-specific command execution (Windows uses `npm.cmd`)

**Code Location:** `scripts/build-electron.js` lines 47-54

**Prevention:**
- Always use `npm run` commands instead of direct binary calls in build scripts
- Test build scripts on Windows before committing
- Use environment variables in `execSync` options rather than command-line flags

---

### Issue 3: Next.js Binary Not Found

**Symptoms:**
- Build fails with: `'next' is not recognized as an internal or external command`
- Error occurs when trying to run `next build` directly
- Works in development but fails in build script

**Root Cause:**
When executing from Node.js scripts, the `node_modules/.bin` directory may not be in PATH, so direct calls to `next` fail.

**Solution:**
Use `npm run build` which properly resolves the `next` binary from `node_modules/.bin`.

**Code Location:** `scripts/build-electron.js` line 50

**Prevention:**
- Always use npm scripts (`npm run <script>`) instead of direct binary calls
- Ensure `node_modules` is properly installed before building

---

### Issue 4: better-sqlite3 Native Module Compilation

**Symptoms:**
- Build fails during `electron-builder install-app-deps` postinstall step
- Error: `node-gyp failed to rebuild 'better-sqlite3'`
- Error: `Could not find any Visual Studio installation to use`
- Error: `Could not locate the bindings file` when running the app

**Root Cause:**
The `better-sqlite3` package contains native C++ code that must be compiled for Electron's specific Node.js version. This requires:
- Visual Studio Build Tools (Windows)
- Python (for node-gyp)
- Proper Node.js headers for Electron version

**Solutions:**

1. **Install Visual Studio Build Tools:**
   - Download and install "Visual Studio Build Tools" or "Visual Studio Community"
   - Ensure "Desktop development with C++" workload is installed
   - Install Windows 10/11 SDK

2. **Install Python:**
   - Python 3.x must be available in PATH
   - Verify with: `python --version` or `py --version`

3. **Rebuild Native Modules:**
   ```bash
   npm rebuild better-sqlite3
   ```
   Or if that fails:
   ```bash
   npm install --ignore-scripts
   npm rebuild better-sqlite3
   ```

4. **Skip Postinstall (Temporary Workaround):**
   ```bash
   npm install --ignore-scripts
   ```
   Then manually rebuild:
   ```bash
   npm rebuild better-sqlite3
   ```

**Prevention:**
- Ensure Visual Studio Build Tools are installed before first build
- Document system requirements for build environment
- Consider using prebuilt binaries if available

---

### Issue 5: Next.js Workspace Detection Issues

**Symptoms:**
- Build fails with: `Next.js inferred your workspace root, but it may not be correct`
- Error: `We couldn't find the Next.js package (next/package.json) from the project directory`
- Multiple lockfiles detected warning

**Root Cause:**
Next.js (especially with Turbopack) tries to auto-detect the workspace root but can get confused by:
- Multiple `package-lock.json` files in parent directories
- Nested project structures
- Incorrect working directory

**Solution:**
1. Ensure you're running build commands from the project root
2. Remove unnecessary `package-lock.json` files from parent directories if not needed
3. The build script already sets the correct working directory with `cwd: path.join(__dirname, '..')`

**Code Location:** `scripts/build-electron.js` line 52

**Prevention:**
- Keep project structure flat when possible
- Ensure build scripts explicitly set working directory
- Document the correct directory to run commands from

---

### Issue 6: API Folder Not Restored After Build

**Symptoms:**
- Render deployment fails because `app/api/[...route]/route.ts` is missing
- Next.js API routes don't work in production
- Git shows `app/api` folder as deleted

**Root Cause:**
The build script temporarily removes the `app/api` folder during static export (because Next.js `output: 'export'` doesn't support API routes). If the build fails or is interrupted, the folder might not be restored.

**Solution:**
The build script uses a `try/finally` block to ensure the API folder is always restored, even if the build fails.

**Code Location:** `scripts/build-electron.js` lines 47-68

**Prevention:**
- Always use try/finally blocks for cleanup operations
- Verify API folder exists after build completes
- Test that Render deployment still works after Electron builds

---

### Issue 7: Static Export Warnings

**Symptoms:**
- Build succeeds but shows warnings:
  - `Specified "rewrites" will not automatically work with "output: export"`
  - `rewrites, redirects, and headers are not applied when exporting your application`

**Root Cause:**
Next.js static export doesn't support rewrites, redirects, or headers. The `next.config.mjs` has rewrites configured for development, which causes warnings during static export.

**Solution:**
The `next.config.mjs` already disables rewrites when `NEXT_EXPORT=true`:
```javascript
async rewrites() {
  if (process.env.NEXT_EXPORT === 'true') {
    return []
  }
  // ... rewrites for development
}
```

**Code Location:** `next.config.mjs` lines 14-25

**Prevention:**
- These warnings are expected and harmless for Electron builds
- They can be ignored as the configuration already handles them correctly

---

## Pre-Conditions / Checks

### Exhaustive Pre-Build Checklist

Before running `npm run electron:build-win`, verify all of the following:

#### 1. System Requirements

- [ ] **Node.js installed** (v18+ recommended)
  - Verify: `node --version`
  - Should match Electron's Node.js version (check `package.json` electron version)

- [ ] **npm installed and working**
  - Verify: `npm --version`
  - Should be v9+ for best compatibility

- [ ] **Python installed** (for native module compilation)
  - Verify: `python --version` or `py --version`
  - Python 3.x required (3.8+ recommended)
  - Must be in system PATH

- [ ] **Visual Studio Build Tools installed** (Windows only)
  - Verify: Visual Studio Installer shows "Desktop development with C++" workload
  - Alternative: Full Visual Studio Community/Professional with C++ workload
  - Must include Windows 10/11 SDK

- [ ] **Git installed** (for version detection)
  - Verify: `git --version`

#### 2. Project Structure

- [ ] **Working directory is project root**
  - Should be: `c:\Users\<user>\personal_projects\miniCRM` (or equivalent)
  - Verify: `package.json` exists in current directory

- [ ] **API folder exists**
  - Verify: `app/api/[...route]/route.ts` exists
  - This folder is temporarily removed during build but must exist before build starts

- [ ] **No conflicting processes**
  - No other Electron instances running
  - No dev servers running on ports 3000 or 3001
  - Check: `netstat -ano | findstr :3000` and `netstat -ano | findstr :3001`

#### 3. Dependencies

- [ ] **All dependencies installed**
  - Verify: `node_modules` folder exists and is populated
  - Run: `npm install` if needed
  - Check for errors during installation

- [ ] **Native modules compiled**
  - Verify: `better-sqlite3` is compiled for current Node.js version
  - Check: `node_modules/better-sqlite3/build/Release/better_sqlite3.node` exists
  - If missing, run: `npm rebuild better-sqlite3`

- [ ] **No dependency conflicts**
  - Check: `npm ls` shows no missing or conflicting dependencies
  - Resolve any peer dependency warnings

#### 4. Build Scripts

- [ ] **Build scripts are executable**
  - Verify: `scripts/build-electron.js` exists and is readable
  - Check file permissions (should be readable)

- [ ] **package.json scripts are correct**
  - Verify: `npm run build:electron` is defined
  - Verify: `npm run build:server` is defined
  - Verify: `npm run electron:build-win` is defined

#### 5. Configuration Files

- [ ] **next.config.mjs is valid**
  - Verify: File exists and has valid JavaScript syntax
  - Check: `output: 'export'` is conditionally set based on `NEXT_EXPORT` env var
  - Verify: Rewrites are disabled when `NEXT_EXPORT=true`

- [ ] **tsconfig.server.json exists**
  - Verify: File exists for TypeScript server compilation
  - Check: Includes all necessary server files

- [ ] **electron-builder config in package.json**
  - Verify: `"build"` section exists in `package.json`
  - Check: Output directory is set correctly (`"output": "dist"`)
  - Verify: Files to include are specified correctly

#### 6. Source Files

- [ ] **All source files present**
  - Verify: `app/` directory exists with all pages
  - Verify: `api/` directory exists with all routes
  - Verify: `components/` directory exists
  - Verify: `lib/` directory exists

- [ ] **Static assets present**
  - Verify: `public/` directory exists with images, icons, etc.
  - Verify: `data/branding/` exists with logo files if used
  - Check: All referenced assets exist (no broken image links)

#### 7. Environment

- [ ] **Environment variables set correctly**
  - `NEXT_EXPORT=true` is set during build (handled by build script)
  - No conflicting environment variables

- [ ] **Disk space available**
  - Verify: At least 2GB free space (for build artifacts and installer)
  - Check: `out/` directory can be created
  - Check: `dist/` directory can be created

- [ ] **File system permissions**
  - Verify: Write permissions in project directory
  - Verify: Can create/delete folders (`out/`, `dist/`, `app/_api_backup/`)

#### 8. Previous Build Artifacts

- [ ] **Clean previous build (optional but recommended)**
  - Delete `out/` folder if exists: `Remove-Item -Recurse -Force out`
  - Delete `dist/` folder if exists: `Remove-Item -Recurse -Force dist`
  - Delete `dist-server/` folder if exists: `Remove-Item -Recurse -Force dist-server`
  - Delete `.next/` folder if exists: `Remove-Item -Recurse -Force .next`

- [ ] **No leftover backup folders**
  - Verify: `app/_api_backup/` does NOT exist (should be cleaned up)
  - If it exists, the previous build may have failed - investigate

#### 9. Code Quality

- [ ] **No TypeScript errors** (optional, but recommended)
  - Run: `npm run build:server` manually to check for TS errors
  - Fix any critical errors before building

- [ ] **No linting errors** (optional)
  - Run: `npm run lint` if available
  - Fix critical linting issues

#### 10. Testing Readiness

- [ ] **Can run in development mode**
  - Verify: `npm run dev` works
  - Verify: `npm run electron:dev` works (if available)
  - This ensures code is functional before building

---

## Build Verification Steps

After running `npm run electron:build-win`, verify the build succeeded:

### 1. Check Build Output

- [ ] **Build completed without errors**
  - Check console output for "✓" success indicators
  - No red error messages
  - Build script completed with exit code 0

### 2. Verify Generated Files

- [ ] **Installer created**
  - Verify: `dist/iManage Setup 1.0.0.exe` exists
  - Check file size (should be ~150-200 MB)
  - Check modification timestamp is recent

- [ ] **Static export created**
  - Verify: `out/` directory exists
  - Verify: `out/index.html` exists
  - Verify: `out/_next/` directory exists with JS/CSS files

- [ ] **Server compiled**
  - Verify: `dist-server/api/server.js` exists
  - Verify: `dist-server/lib/` contains compiled files

### 3. Verify API Folder Restored

- [ ] **API folder exists after build**
  - Verify: `app/api/[...route]/route.ts` exists
  - Verify: `app/_api_backup/` does NOT exist (was cleaned up)
  - This is critical for Render deployment

### 4. Test the Installer (Optional)

- [ ] **Install and run the app**
  - Install `dist/iManage Setup 1.0.0.exe` on a test machine
  - Launch the application
  - Verify: No console errors
  - Verify: Static assets load (images, CSS, JS)
  - Verify: Application functionality works

---

## Quick Reference: Build Commands

```bash
# Full Electron build for Windows
npm run electron:build-win

# Build unpacked version (for testing)
npm run electron:build-win-unpacked

# Build individual components
npm run build:electron    # Next.js static export
npm run build:server      # TypeScript server compilation
npm run build:all         # Both above

# Development
npm run dev               # Development server
npm run electron:dev     # Electron in dev mode
```

---

## Troubleshooting Quick Reference

| Symptom | Quick Fix |
|---------|-----------|
| `cross-env not found` | Use `npm run build` instead of direct `next` call |
| `next not found` | Use `npm run build` instead of direct binary |
| `better-sqlite3 bindings not found` | Run `npm rebuild better-sqlite3` |
| `Visual Studio not found` | Install Visual Studio Build Tools with C++ workload |
| `API folder missing` | Check if build was interrupted, restore from git |
| `Static assets 404` | Verify Express catch-all route excludes static extensions |
| `Unexpected token '<'` | Check Express server catch-all route configuration |

---

## Related Documentation

- [BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md) - General build instructions
- [ELECTRON_SERVER_FIXES_2024-12-29.md](./ELECTRON_SERVER_FIXES_2024-12-29.md) - Server-specific fixes
- [FIX_WHITE_SCREEN.md](./FIX_WHITE_SCREEN.md) - White screen issues

---

## Last Updated

December 30, 2025




