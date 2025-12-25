# Rebuild Instructions - White Screen Fix

## Problem Fixed
The Electron app was showing a white screen because it tried to load from `http://localhost:3000` instead of the static files. This has been fixed by using `app.isPackaged` to properly detect production mode.

## Steps to Rebuild

### 1. Navigate to Project Directory
```bash
cd miniCRM
```

### 2. Build Static Export
```bash
npm run build
```
This creates the `out/` folder with all static HTML files.

### 3. Build Electron App (Unpacked)
```bash
npm run electron:build-win-unpacked
```
This creates `dist/win-unpacked/` with the executable and all files.

**Note:** You may see warnings about code signing - these are safe to ignore.

### 4. Create Portable Zip
**Option A: Use the PowerShell script**
```powershell
.\create-portable-zip.ps1
```

**Option B: Manual command**
```powershell
$date = Get-Date -Format 'yyyy-MM-dd_HH-mm'
$zipName = "iManage_Portable_v1.0_Fixed_$date.zip"
Compress-Archive -Path "dist\win-unpacked\*" -DestinationPath $zipName -CompressionLevel Optimal
```

## What's Fixed

✅ **Uses `app.isPackaged`** - Reliable detection of production mode
✅ **Loads static files directly** - No need for `npm run dev`
✅ **Works completely offline** - All files bundled in the zip
✅ **Better error handling** - Shows helpful messages if something goes wrong

## Testing

After creating the portable zip:
1. Extract it to a new folder
2. Run `iManage.exe` directly
3. The app should load immediately without needing `npm run dev`

## Expected Result

- ✅ App loads immediately
- ✅ No white screen
- ✅ All features work
- ✅ Completely standalone - no dependencies needed

## File Locations

- **Build output:** `dist/win-unpacked/`
- **Portable zip:** `iManage_Portable_v1.0_Fixed_[date].zip`
- **Executable:** `dist/win-unpacked/iManage.exe`

