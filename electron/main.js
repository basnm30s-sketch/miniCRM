const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const isDev = require('electron-is-dev');
const os = require('os');

// IPC handler for error logging from renderer
ipcMain.handle('log-error', async (event, errorData) => {
  const timestamp = new Date().toISOString();
  console.error('========================================');
  console.error(`[${timestamp}] Renderer Error Logged`);
  console.error('Message:', errorData.message);
  console.error('Stack:', errorData.stack);
  if (errorData.componentStack) {
    console.error('Component Stack:', errorData.componentStack);
  }
  console.error('========================================');
  
  // Log to file
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, `renderer-error-${Date.now()}.log`);
    const logContent = `[${timestamp}] Renderer Error\n` +
      `Message: ${errorData.message}\n` +
      `Stack: ${errorData.stack || 'N/A'}\n` +
      `Component Stack: ${errorData.componentStack || 'N/A'}\n` +
      `App Version: ${app.getVersion()}\n` +
      `Platform: ${process.platform}\n` +
      `Node Version: ${process.version}\n`;
    fs.writeFileSync(logFile, logContent);
  } catch (logError) {
    console.error('Failed to save error log:', logError);
  }
  
  return { success: true };
});

let db = null;
let apiServer = null;
let serverStartupPromise = null;
let healthCheckInterval = null;
let consecutiveHealthFailures = 0;
let isQuitting = false;

const HEALTH_CHECK_URL = 'http://localhost:3001/api/health';
const HEALTH_CHECK_INTERVAL_MS = 5000;
const HEALTH_FAILURE_THRESHOLD = 5;
const HEALTH_REQUEST_TIMEOUT_MS = 4000;

function resolveFirstExisting(...candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function getApiEntryPath() {
  if (app.isPackaged) {
    // In packaged mode, use compiled JavaScript from dist-server
    const resourcesPath = process.resourcesPath || app.getAppPath();
    return resolveFirstExisting(
      path.join(resourcesPath, 'app.asar', 'dist-server', 'api', 'server.js'),
      path.join(resourcesPath, 'dist-server', 'api', 'server.js'),
      path.join(app.getAppPath(), 'dist-server', 'api', 'server.js'),
    );
  }

  // In development, use TypeScript source with tsx
  return path.join(__dirname, '..', 'api', 'server.ts');
}

function getTsxExecutablePath() {
  const binName = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
  if (app.isPackaged) {
    const resourcesPath = process.resourcesPath || app.getAppPath();
    return resolveFirstExisting(
      path.join(resourcesPath, 'app.asar', 'node_modules', '.bin', binName),
      path.join(resourcesPath, 'node_modules', '.bin', binName),
      path.join(app.getAppPath(), 'node_modules', '.bin', binName),
      path.join(app.getAppPath(), 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    );
  }

  return resolveFirstExisting(
    path.join(__dirname, '..', 'node_modules', '.bin', binName),
    path.join(process.cwd(), 'node_modules', '.bin', binName),
    path.join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
  );
}

function ensureDir(dirPath) {
  if (!dirPath) return;
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to ensure directory:', dirPath, err);
  }
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      // Don't overwrite newer files in destination
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

function seedDefaultBrandingIfMissing(userDataDir) {
  try {
    const persistentBrandingDir = path.join(userDataDir, 'data', 'branding');
    ensureDir(persistentBrandingDir);

    const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const types = ['logo', 'seal', 'signature'];

    const assetsDir = path.join(__dirname, 'assets', 'default-branding');

    for (const type of types) {
      const alreadyExists = possibleExtensions.some((ext) =>
        fs.existsSync(path.join(persistentBrandingDir, `${type}${ext}`))
      );
      if (alreadyExists) continue;

      const src = resolveFirstExisting(
        path.join(assetsDir, `${type}.png`),
        path.join(app.getAppPath(), 'electron', 'assets', 'default-branding', `${type}.png`)
      );
      if (!src) {
        logToFile('seed-missing', `Default branding asset not found for ${type}`);
        continue;
      }

      const dest = path.join(persistentBrandingDir, `${type}.png`);
      fs.copyFileSync(src, dest);
      logToFile('seed', `Seeded default branding ${type} -> ${dest}`);
    }
  } catch (err) {
    console.error('Seeding default branding failed:', err);
    logToFile('seed-error', `Seeding default branding failed: ${err?.message || err}`);
  }
}

function migrateLegacyDataIfNeeded(userDataDir) {
  try {
    const newDataDir = path.join(userDataDir, 'data');
    ensureDir(newDataDir);

    // Legacy location was based on process.cwd() which, in packaged builds, is often the install directory.
    const installDir = path.dirname(process.execPath);
    const oldDataDir = path.join(installDir, 'data');

    const oldDb = path.join(oldDataDir, 'imanage.db');
    const newDb = path.join(newDataDir, 'imanage.db');

    if (!fs.existsSync(newDb) && fs.existsSync(oldDb)) {
      console.log('Migrating legacy DB to userData...');
      fs.copyFileSync(oldDb, newDb);
      logToFile('migration', `Copied legacy DB from ${oldDb} to ${newDb}`);
    }

    // Migrate uploads/branding if missing in new location
    const oldUploads = path.join(oldDataDir, 'uploads');
    const newUploads = path.join(newDataDir, 'uploads');
    if (fs.existsSync(oldUploads) && !fs.existsSync(newUploads)) {
      console.log('Migrating legacy uploads to userData...');
      copyDirRecursive(oldUploads, newUploads);
      logToFile('migration', `Copied legacy uploads from ${oldUploads} to ${newUploads}`);
    }

    const oldBranding = path.join(oldDataDir, 'branding');
    const newBranding = path.join(newDataDir, 'branding');
    if (fs.existsSync(oldBranding) && !fs.existsSync(newBranding)) {
      console.log('Migrating legacy branding to userData...');
      copyDirRecursive(oldBranding, newBranding);
      logToFile('migration', `Copied legacy branding from ${oldBranding} to ${newBranding}`);
    }
  } catch (err) {
    console.error('Legacy data migration failed:', err);
    logToFile('migration-error', `Legacy data migration failed: ${err?.message || err}`);
  }
}

function logToFile(prefix, message) {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}${os.EOL}`);
  } catch (err) {
    console.error('Failed to write log file:', err);
  }
}

async function pingServerHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(HEALTH_CHECK_URL, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      consecutiveHealthFailures = 0;
      return true;
    }
  } catch (err) {
    // swallow, we log below
  } finally {
    clearTimeout(timeout);
  }
  consecutiveHealthFailures += 1;
  console.warn(`Health check failed (${consecutiveHealthFailures}/${HEALTH_FAILURE_THRESHOLD})`);
  if (consecutiveHealthFailures >= HEALTH_FAILURE_THRESHOLD) {
    logToFile('api-health', `Health check threshold hit; restarting API server`);
    restartApiServer('health-check-failed');
  }
  return false;
}

function startHealthWatcher() {
  if (healthCheckInterval) return;
  healthCheckInterval = setInterval(pingServerHealth, HEALTH_CHECK_INTERVAL_MS);
}

function stopHealthWatcher() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

function restartApiServer(reason) {
  console.warn('Restarting API server. Reason:', reason);
  if (apiServer) {
    try {
      apiServer.kill();
    } catch (err) {
      console.error('Error killing API server during restart:', err);
    }
  }
  apiServer = null;
  serverStartupPromise = null;
  consecutiveHealthFailures = 0;
  startApiServer().catch((err) => {
    console.error('Failed to restart API server:', err);
    logToFile('api-restart-failure', `Failed to restart API server: ${err?.message || err}`);
  });
}

// Start API server in production or development builds
function startApiServer() {
  if (serverStartupPromise) {
    return serverStartupPromise;
  }

  const apiPath = getApiEntryPath();
  if (!apiPath) {
    console.warn('API server entry point not found; skipping backend start.');
    return Promise.resolve();
  }

  // In packaged mode, run compiled JS with node
  // In dev mode, run TS with tsx
  const isPackaged = app.isPackaged;
  const useNode = isPackaged && apiPath.endsWith('.js');
  
  let command, args, cwd;
  
  if (useNode) {
    // Packaged: use node to run compiled JavaScript
    // Get the real path outside of ASAR for spawning
    const realExecPath = process.execPath.replace('app.asar', 'app.asar.unpacked');
    command = process.execPath;
    args = [apiPath];
    // Set CWD to a real directory (not inside ASAR)
    cwd = path.dirname(process.execPath);
    console.log('Using Node.js to run compiled server');
    console.log('Exec path:', process.execPath);
  } else {
    // Development: use tsx to run TypeScript
    const tsxPath = getTsxExecutablePath();
    command = process.execPath;
    args = tsxPath ? [tsxPath, apiPath] : ['-r', 'tsx/register', apiPath];
    cwd = path.join(__dirname, '..');
    console.log('Using tsx to run TypeScript server');
  }

  // Persist all app data (DB + uploads/branding) in userData, not install directory.
  const userDataDir = app.getPath('userData');
  const persistentDataDir = path.join(userDataDir, 'data');
  ensureDir(persistentDataDir);
  migrateLegacyDataIfNeeded(userDataDir);
  // Seed defaults only if missing (won't overwrite user files)
  seedDefaultBrandingIfMissing(userDataDir);

  const env = {
    ...process.env,
    PORT: '3001',
    NODE_ENV: isDev ? 'development' : 'production',
    ELECTRON_RUN_AS_NODE: '1',
    IMANAGE_USER_DATA_DIR: userDataDir,
    IMANAGE_DATA_DIR: persistentDataDir,
    DB_PATH: path.join(persistentDataDir, 'imanage.db'),
  };

  console.log('========================================');
  console.log('Starting API server...');
  console.log('Is Packaged:', isPackaged);
  console.log('API entry:', apiPath);
  console.log('API exists:', fs.existsSync(apiPath));
  console.log('Command:', command);
  console.log('Args:', args);
  console.log('CWD:', cwd);
  console.log('========================================');

  serverStartupPromise = new Promise((resolve, reject) => {
    let resolved = false;
    let serverOutput = '';

    const markReady = () => {
      if (resolved) return;
      resolved = true;
      console.log('✓ Server marked as ready');
      resolve();
    };

    try {
      // Use shell: true on Windows for packaged apps to avoid ENOENT issues
      const useShell = process.platform === 'win32' && isPackaged;
      apiServer = spawn(command, args, {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: useShell,
        windowsHide: true,
      });

      console.log('✓ API server process spawned, PID:', apiServer.pid);
    } catch (error) {
      console.error('✗ Error spawning API server:', error);
      serverStartupPromise = null;
      apiServer = null;
      reject(error);
      return;
    }

    apiServer.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      console.log(`[API Server STDOUT]: ${output}`);
      
      // Mark ready when we see the server running message
      if (output.includes('API server running on') || output.includes('Server running on')) {
        markReady();
      }
    });

    apiServer.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`[API Server STDERR]: ${output}`);
      
      // If we see critical errors, reject immediately
      if (output.includes('Cannot find module') || output.includes('Error:')) {
        console.error('✗ Critical server error detected');
      }
    });

    apiServer.on('close', (code) => {
      console.log(`✗ API server exited with code ${code}`);
      console.log('Last output:', serverOutput);
      apiServer = null;
      serverStartupPromise = null;
      logToFile('api-exit', `API server exited with code ${code}. Output: ${serverOutput}`);
      // Do NOT restart when the app is quitting
      if (!isQuitting) {
        setTimeout(() => restartApiServer(`exit-code-${code}`), 1000);
      }

      if (!resolved && code !== 0) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    apiServer.on('error', (error) => {
      console.error('✗ Failed to start API server:', error);
      apiServer = null;
      const err = new Error('API server spawn error');
      err.cause = error;
      serverStartupPromise = null;
      reject(err);
    });

    // Longer timeout for packaged apps (5 seconds)
    const timeout = isPackaged ? 5000 : 3000;
    setTimeout(() => {
      if (!resolved) {
        console.log(`⚠ Server startup timeout (${timeout}ms), assuming ready...`);
        console.log('Server output so far:', serverOutput);
        markReady();
      }
    }, timeout);
  });

  return serverStartupPromise;
}

// Initialize database when app is ready (optional - only if better-sqlite3 is available)
app.whenReady().then(async () => {
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
  
  console.log('\n🚀 Starting Electron app initialization...\n');
  
  try {
    await startApiServer();
    console.log('✓ API server startup completed');
    startHealthWatcher();
    
    // Additional delay to ensure server is fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✓ Additional startup delay completed');
  } catch (error) {
    console.error('✗ API server startup failed:', error);
    console.error('Stack:', error.stack);
    console.log('⚠ Continuing without backend server...');
  }
  
  createWindow();
});

async function createWindow() {
  const firstRunFlagPath = path.join(app.getPath('userData'), 'first-run.json');
  let isFirstPackagedRun = false;
  if (app.isPackaged) {
    try {
      isFirstPackagedRun = !fs.existsSync(firstRunFlagPath);
    } catch (err) {
      // If we can't read the flag for any reason, don't block startup
      isFirstPackagedRun = false;
    }
  }

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'iManage - Car Rental CRM',
    show: false, // Don't show until loaded
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Show window when ready
  win.once('ready-to-show', () => {
    if (isFirstPackagedRun) {
      try {
        win.maximize();
      } catch (err) {
        // ignore
      }
    }
    win.show();
    if (isFirstPackagedRun) {
      try {
        fs.writeFileSync(firstRunFlagPath, JSON.stringify({ ran: true, at: new Date().toISOString() }, null, 2));
      } catch (err) {
        // ignore
      }
    }
  });

  // ============================================
  // RENDERER CRASH DETECTION & ERROR HANDLING
  // ============================================
  
  // Track renderer crashes
  win.webContents.on('render-process-gone', (event, details) => {
    const timestamp = new Date().toISOString();
    console.error('========================================');
    console.error(`[${timestamp}] RENDERER PROCESS CRASHED`);
    console.error('Reason:', details.reason);
    console.error('Exit Code:', details.exitCode);
    console.error('========================================');
    
    // Log to file if possible (for persistent debugging)
    try {
      const logDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, `crash-${Date.now()}.log`);
      const logContent = `[${timestamp}] Renderer Process Crashed\n` +
        `Reason: ${details.reason}\n` +
        `Exit Code: ${details.exitCode}\n` +
        `App Version: ${app.getVersion()}\n` +
        `Platform: ${process.platform}\n` +
        `Node Version: ${process.version}\n` +
        `Electron Version: ${process.versions.electron}\n` +
        `Chrome Version: ${process.versions.chrome}\n` +
        `Server URL: http://localhost:3001\n` +
        `Is Packaged: ${app.isPackaged}\n`;
      fs.writeFileSync(logFile, logContent);
      console.error('Crash log saved to:', logFile);
    } catch (logError) {
      console.error('Failed to save crash log:', logError);
    }
    
    // Attempt automatic reload for recoverable crashes
    if (details.reason === 'clean-exit' || details.reason === 'abnormal-exit') {
      console.log('Attempting to reload window...');
      setTimeout(() => {
        if (!win.isDestroyed()) {
          win.reload();
        }
      }, 1000);
    }
  });

  // Handle unresponsive renderer
  win.webContents.on('unresponsive', () => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] Renderer process became unresponsive`);
  });

  // Handle responsive recovery
  win.webContents.on('responsive', () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Renderer process recovered`);
  });

  // Capture console errors from renderer
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const timestamp = new Date().toISOString();
    const levelStr = ['', 'INFO', 'WARN', 'ERROR'][level] || 'LOG';
    if (level >= 2) { // Only log warnings and errors to main process
      console.log(`[${timestamp}] [Renderer ${levelStr}] ${message} (${sourceId}:${line})`);
    }
  });

  // Capture JavaScript errors from renderer
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] Failed to load: ${validatedURL}`);
      console.error(`Error Code: ${errorCode}, Description: ${errorDescription}`);
      
      // Log to file
      try {
        const logDir = path.join(app.getPath('userData'), 'logs');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(logDir, `load-error-${Date.now()}.log`);
        const logContent = `[${timestamp}] Failed to Load Page\n` +
          `URL: ${validatedURL}\n` +
          `Error Code: ${errorCode}\n` +
          `Description: ${errorDescription}\n` +
          `Is Main Frame: ${isMainFrame}\n`;
        fs.writeFileSync(logFile, logContent);
      } catch (logError) {
        // Ignore logging errors
      }
    }
  });

  // Load the app
  // CRITICAL: Always load from HTTP server (not file://)
  // The Express server serves static files from 'out/' directory
  const serverURL = 'http://localhost:3001';
  
  console.log('========================================');
  console.log('Loading window...');
  console.log('Mode:', app.isPackaged ? 'PRODUCTION' : 'DEVELOPMENT');
  console.log('Server URL:', serverURL);
  console.log('App path:', app.getAppPath());
  console.log('========================================');

  // Retry logic for server connection
  const maxRetries = 5;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    attempt++;
    console.log(`Attempt ${attempt}/${maxRetries} to load from server...`);
    
    try {
      await win.loadURL(serverURL);
      console.log('✓ Successfully loaded from server');
      
      // Open DevTools in development
      if (!app.isPackaged) {
        win.webContents.openDevTools();
      }
      
      break; // Success, exit retry loop
    } catch (err) {
      console.error(`✗ Attempt ${attempt} failed:`, err.message);
      
      if (attempt < maxRetries) {
        console.log(`Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // All retries failed, show error
        console.error('✗ All connection attempts failed');
        
        const errorHtml = `
          <html>
            <head>
              <title>iManage - Error</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                  padding: 40px;
                  text-align: center;
                  background: #f5f5f5;
                }
                .error-box {
                  background: white;
                  border-radius: 8px;
                  padding: 30px;
                  max-width: 600px;
                  margin: 0 auto;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { color: #e74c3c; margin-top: 0; }
                .details {
                  text-align: left;
                  background: #f9f9f9;
                  padding: 15px;
                  border-radius: 4px;
                  margin: 20px 0;
                  font-family: monospace;
                  font-size: 12px;
                }
                .detail-row { margin: 5px 0; }
                .label { font-weight: bold; color: #666; }
              </style>
            </head>
            <body>
              <div class="error-box">
                <h1>Application Error</h1>
                <p>Could not connect to Express server</p>
                <p><strong>Error:</strong> ${err.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                <div class="details">
                  <div class="detail-row"><span class="label">Server URL:</span> ${serverURL}</div>
                  <div class="detail-row"><span class="label">Attempts:</span> ${maxRetries}</div>
                  <div class="detail-row"><span class="label">App Path:</span> ${app.getAppPath().replace(/\\/g, '/')}</div>
                  <div class="detail-row"><span class="label">Is Packaged:</span> ${app.isPackaged}</div>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Please ensure the API server started successfully.<br>
                  Check the Electron console for server startup logs.
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                  Press <kbd>Ctrl+Shift+I</kbd> (Windows) or <kbd>Cmd+Option+I</kbd> (Mac) to open DevTools
                </p>
              </div>
            </body>
          </html>
        `;
        win.loadURL('data:text/html,' + encodeURIComponent(errorHtml));
        win.show(); // Show error page
      }
    }
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
  
  return win;
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
app.on('before-quit', async () => {
  isQuitting = true;

  if (apiServer) {
    const child = apiServer;
    const pid = child.pid;
    console.log('Stopping API server...');
    child.kill();

    if (process.platform === 'win32' && pid) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } catch (e) {
        // process may already be gone
      }
    }

    await new Promise((resolve) => {
      const done = () => {
        clearTimeout(t);
        resolve();
      };
      const t = setTimeout(done, 2500);
      child.once('close', done);
    });
    apiServer = null;
  }

  stopHealthWatcher();

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
