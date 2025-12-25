# iManage - Build Instructions

## Quick Start

### 1. Install Dependencies
```bash
cd miniCRM\miniCRM
npm install
```

### 2. Build Static Export
```bash
npm run build
```

This will:
- Export Next.js as static files to `out/` directory
- All pages will be pre-rendered as HTML

### 3. Build Electron App (Windows)
```bash
npm run electron:build-win
```

This will:
- Create a Windows installer in `dist/` directory
- File name: `iManage Setup X.X.X.exe`

### 4. Test the Build (Optional)
```bash
npm run electron:build-win-unpacked
```

This creates an unpacked version in `dist/win-unpacked/` that you can run directly without installing.

## Development Mode

To run in development mode with hot reload:
```bash
npm run electron:dev
```

This will:
- Start Next.js dev server on port 3000
- Launch Electron window
- Enable hot reload for development

## Distribution

### Share the Installer
The installer file (`iManage Setup X.X.X.exe`) in the `dist/` folder can be:
- Shared via USB drive
- Uploaded to cloud storage
- Distributed via email
- Installed on any Windows machine

### Installation Process
End users simply:
1. Run the installer
2. Follow the installation wizard
3. Launch "iManage" from Start Menu
4. Start using the application

## Troubleshooting

### Build Fails with "out directory not found"
**Solution**: Run `npm run build` first to create the static export.

### Electron window is blank
**Solution**: 
1. Check that `out/index.html` exists
2. Verify Next.js export completed successfully
3. Check Electron console for errors (DevTools)

### App doesn't save data
**Solution**: 
- Data is stored in browser localStorage
- In Electron, this persists in the app's user data directory
- Data will persist between app restarts

## File Structure After Build

```
miniCRM/
├── out/                    # Static Next.js export
│   ├── index.html
│   ├── _next/
│   └── ...
├── dist/                   # Electron build output
│   ├── iManage Setup X.X.X.exe
│   └── win-unpacked/      # Unpacked app (for testing)
└── ...
```

## Notes

- The app is fully offline - no internet required
- All data is stored locally using localStorage
- PDF generation works offline
- All features are functional without network connection

