# Build, Reinstall, and Launch (Windows)

This workflow automates:

1. Stop running iManage processes
2. Uninstall existing iManage installation
3. Remove installation folders
4. Build a fresh Windows installer
5. Install the generated setup silently
6. Launch the installed app automatically

## Canonical Scripts

- `scripts/cleanup-imanage.ps1`
- `scripts/build-installer-win.ps1`

## Recommended Commands

From the project root:

```powershell
# Default: preserve app data for faster testing
npm run electron:build-win:installer

# Full reset: remove app data before build/install/launch
npm run electron:build-win:full-reset
```

Backward-compatible alias:

```powershell
npm run electron:build-win:auto
```

## Cleanup Behavior

`scripts/cleanup-imanage.ps1` always:

- Stops `iManage` process(es)
- Runs silent uninstaller if found
- Deletes installation folders

App data is preserved by default. To remove app data as well, pass `-RemoveAppData`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/cleanup-imanage.ps1 -RemoveAppData
```

App-data paths removed only in full-reset mode:

- `%APPDATA%\iManage`
- `%LOCALAPPDATA%\iManage`
- `%APPDATA%\com.imanage.crm`
- `%LOCALAPPDATA%\com.imanage.crm`

## Notes

- Installer runs with `/S` (silent mode).
- If UAC/admin permission is required on your machine, Windows may still prompt.
- Build script searches `dist` and selects the newest `*Setup*.exe`.
- If launch fails, verify install path and app name:
  - `%LOCALAPPDATA%\Programs\iManage\iManage.exe`
  - `%ProgramFiles%\iManage\iManage.exe`
  - `%ProgramFiles(x86)%\iManage\iManage.exe`
