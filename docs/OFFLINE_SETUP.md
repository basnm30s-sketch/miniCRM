# iManage - Offline Setup Guide

This guide explains how to package "iManage" as a standalone offline Electron application.

## Current Storage: localStorage

The application currently uses **localStorage** for data persistence, which:
- ✅ Works immediately without build tools
- ✅ Works in both browser and Electron
- ✅ Maintains backward compatibility
- ✅ No additional setup required

SQLite support is prepared but optional (see STORAGE_MIGRATION.md for details).

## Prerequisites

### For Development/Building:
1. **Node.js** (v18 or higher) - Already installed ✓
2. **Visual Studio Build Tools** (Optional - only needed if you want to enable SQLite later)
   - Download from: https://visualstudio.microsoft.com/downloads/
   - Install "Desktop development with C++" workload

### For End Users:
- No prerequisites needed! The packaged app is fully standalone.

## Installation Steps

### 1. Install Visual Studio Build Tools (Windows only)
If you haven't already:
- Download and install Visual Studio Build Tools
- Select "Desktop development with C++" workload
- This is required to compile better-sqlite3 native module

### 2. Install Dependencies
```bash
cd miniCRM\miniCRM
npm install
```

This will install all dependencies. Note: better-sqlite3 is listed but won't be installed until you have build tools (it's optional for now).

### 3. Build the Application

#### For Development:
```bash
npm run electron:dev
```

#### For Production Build (Windows):
```bash
npm run electron:build-win
```

This will:
1. Export Next.js as static files to `out/` directory
2. Package everything into an Electron app
3. Create an installer in `dist/` directory

### 4. Distribution

The built installer will be located at:
```
dist/iManage Setup X.X.X.exe
```

You can share this installer file with end users. They just need to:
1. Run the installer
2. Install the application
3. Launch "iManage" from Start Menu or desktop shortcut

## Data Storage Location

- **Browser/Development**: Browser's localStorage
- **Electron (Production)**: Browser's localStorage (same as development)
- **Future (SQLite)**: `%APPDATA%/iManage/imanage.db` (Windows) - when SQLite is enabled

## Features

✅ Fully offline - no internet connection required
✅ localStorage for data persistence (works immediately)
✅ Portable - can be installed on any Windows machine
✅ All features work offline:
   - Invoice management
   - Purchase order management
   - Customer/vendor management
   - PDF generation
   - Dashboard with receivables tracking
   - All CRUD operations
   - Amount received tracking
   - Pending amount calculations

## Troubleshooting

### Issue: better-sqlite3 installation fails
**Solution**: This is optional. The app works fine with localStorage. If you want SQLite, install Visual Studio Build Tools with "Desktop development with C++" workload.

### Issue: Data not persisting
**Solution**: Check browser localStorage. In Electron, data persists in the app's localStorage. Clear data only if you clear browser data.

### Issue: Build fails
**Solution**: 
1. Ensure Next.js export is successful: `npm run build`
2. Check that `out/` directory exists after build
3. Verify electron-builder is installed: `npm list electron-builder`

### Issue: Build fails
**Solution**: 
1. Ensure Next.js export is successful: `npm run build`
2. Check that `out/` directory exists after build
3. Verify electron-builder is installed: `npm list electron-builder`

## Next Steps

After building:
1. Test the installer on a clean Windows machine
2. Verify all features work offline
3. Share the installer file with end users
4. Consider adding auto-update functionality (optional)

## Notes

- The app uses localStorage for data persistence (works immediately, no build tools needed)
- SQLite support is prepared but optional (see STORAGE_MIGRATION.md)
- Data is stored locally on each machine
- No cloud sync (by design for offline use)
- PDF generation works offline using client-side libraries
- All existing functionality is preserved and working

