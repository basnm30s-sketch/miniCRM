const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

let db = null;
let apiServer = null;

// Start API server in production mode
function startApiServer() {
  if (apiServer) {
    console.log('API server already running');
    return;
  }

  const fs = require('fs');
  
  // Check if we're in packaged mode
  if (app.isPackaged) {
    // In packaged mode, files are in ASAR archive
    // We need to use the correct path - ASAR files are read-only, so we can't execute from there
    // Use process.resourcesPath which points to the resources folder (outside ASAR)
    const resourcesPath = process.resourcesPath || app.getAppPath();
    
    // Try to find the API server - it should be in the app.asar or resources
    let apiPath = path.join(resourcesPath, 'app.asar', 'api', 'server.ts');
    if (!fs.existsSync(apiPath)) {
      // Try without .asar (if unpacked)
      apiPath = path.join(resourcesPath, 'api', 'server.ts');
    }
    if (!fs.existsSync(apiPath)) {
      // Try app.getAppPath() which handles ASAR automatically
      apiPath = path.join(app.getAppPath(), 'api', 'server.ts');
    }
    
    // Find tsx - it should be in node_modules
    let tsxPath = path.join(resourcesPath, 'app.asar', 'node_modules', '.bin', 'tsx');
    if (!fs.existsSync(tsxPath)) {
      tsxPath = path.join(resourcesPath, 'app.asar', 'node_modules', 'tsx', 'dist', 'cli.mjs');
    }
    if (!fs.existsSync(tsxPath)) {
      tsxPath = path.join(app.getAppPath(), 'node_modules', '.bin', 'tsx');
    }
    if (!fs.existsSync(tsxPath) && process.platform === 'win32') {
      tsxPath = path.join(app.getAppPath(), 'node_modules', '.bin', 'tsx.cmd');
    }
    
    // Use Electron's node to run tsx
    const electronPath = process.execPath;
    let command, args;
    
    if (fs.existsSync(tsxPath)) {
      // Use tsx directly
      command = electronPath;
      args = [tsxPath, apiPath];
      console.log('Using tsx to run API server');
    } else {
      // Try using node with tsx module
      command = electronPath;
      args = ['-r', 'tsx/cjs/api', apiPath];
      console.log('Trying to use node with tsx loader');
    }
    
    console.log('Starting API server...');
    console.log('Resources path:', resourcesPath);
    console.log('App path:', app.getAppPath());
    console.log('API path:', apiPath);
    console.log('Command:', command);
    console.log('Args:', args);
    
    try {
      apiServer = spawn(command, args, {
        cwd: app.getAppPath(),
        env: {
          ...process.env,
          PORT: '3001',
          NODE_ENV: 'production',
          ELECTRON_RUN_AS_NODE: '1', // Important: allows spawning Node.js processes
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });

      apiServer.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`API Server: ${output}`);
      });

      apiServer.stderr.on('data', (data) => {
        const output = data.toString();
        console.error(`API Server Error: ${output}`);
      });

      apiServer.on('close', (code) => {
        console.log(`API server exited with code ${code}`);
        apiServer = null;
      });

      apiServer.on('error', (error) => {
        console.error('Failed to start API server:', error);
        apiServer = null;
      });

      // Wait a bit for server to start
      setTimeout(() => {
        console.log('API server should be running on http://localhost:3001');
      }, 3000);
    } catch (error) {
      console.error('Error spawning API server:', error);
      apiServer = null;
    }
  } else {
    // In development, the API server is started separately via npm run api:dev
    console.log('Development mode - API server should be running separately');
  }
}

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
  
  // Start API server in production mode
  if (app.isPackaged) {
    startApiServer();
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
  // Stop API server
  if (apiServer) {
    console.log('Stopping API server...');
    apiServer.kill();
    apiServer = null;
  }
  
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
