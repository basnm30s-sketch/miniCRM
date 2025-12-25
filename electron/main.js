const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let db = null;

// Initialize database when app is ready (optional - only if better-sqlite3 is available)
app.whenReady().then(() => {
  try {
    // Try to initialize database in main process (optional - will use localStorage if not available)
    // Note: database.ts uses ES6 imports, so we need to handle this carefully
    // For now, we'll skip database initialization and use localStorage
    // Uncomment below when SQLite is properly set up:
    // const { initDatabase } = require('../lib/database');
    // db = initDatabase();
    // console.log('Database initialized successfully');
    console.log('Using localStorage for data persistence');
    db = null;
  } catch (error) {
    // Database initialization failed - app will use localStorage instead
    console.log('Database not available, using localStorage:', error.message);
    db = null;
  }
  
  createWindow();
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'iManage - Car Rental CRM',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the app
  // Use app.isPackaged - the most reliable way to detect packaged vs development
  // app.isPackaged is true when the app is packaged, false in development
  if (!app.isPackaged) {
    // Development mode - load from Next.js dev server
    // Only load from localhost if we're actually in development
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    // Production mode - load from static export
    // In packaged Electron app, files are in resources/app.asar/out/
    // app.getAppPath() returns the path to the ASAR archive in production
    const indexPath = path.join(app.getAppPath(), 'out', 'index.html');
    
    console.log('Production mode - Loading from:', indexPath);
    console.log('App path:', app.getAppPath());
    console.log('Is packaged:', app.isPackaged);
    
    // loadFile can read from ASAR archives automatically
    win.loadFile(indexPath).catch(err => {
      console.error('Error loading index.html:', err);
      console.error('Tried path:', indexPath);
      
      // Show helpful error message with debug info
      const errorHtml = `
        <html>
          <head><title>iManage - Error</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>Application Error</h1>
            <p>Could not load index.html</p>
            <p><strong>Error:</strong> ${err.message}</p>
            <p><strong>Tried path:</strong> ${indexPath}</p>
            <p><strong>App Path:</strong> ${app.getAppPath()}</p>
            <p><strong>Is Packaged:</strong> ${app.isPackaged}</p>
            <p>Please rebuild the application.</p>
          </body>
        </html>
      `;
      win.loadURL('data:text/html,' + encodeURIComponent(errorHtml));
    });
  }

  // Handle window closed
  win.on('closed', () => {
    // Close database connection when window closes (if database was initialized)
    if (db) {
      try {
        // Uncomment when SQLite is set up:
        // const { closeDatabase } = require('../lib/database');
        // closeDatabase();
        db = null;
      } catch (error) {
        console.error('Error closing database:', error);
      }
    }
  });
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cleanup on app quit
app.on('before-quit', () => {
  if (db) {
    try {
      // Uncomment when SQLite is set up:
      // const { closeDatabase } = require('../lib/database');
      // closeDatabase();
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
});
