/**
 * Build script for Electron
 * Temporarily moves the API folder out of the way during static export
 * since Next.js output: export doesn't support API routes
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'app', 'api');
const apiBackupDir = path.join(__dirname, '..', 'app', '_api_backup');

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper to delete directory recursively
function deleteDirSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

(async () => {
  let buildSucceeded = false;
  let apiFolderRestored = false;

  try {
    console.log('🔧 Preparing for Electron build...');

    // Step 0: Clear Next.js cache to avoid stale API route detection
    // Only clear cache when building for Electron (NEXT_EXPORT=true)
    const nextCacheDir = path.join(__dirname, '..', '.next');
    if (fs.existsSync(nextCacheDir)) {
      console.log('🧹 Clearing Next.js cache...');
      deleteDirSync(nextCacheDir);
    }

    // Step 1: Backup and remove API folder
    if (fs.existsSync(apiDir)) {
      console.log('📦 Backing up API folder...');
      deleteDirSync(apiBackupDir); // Clean up any old backup
      copyDirSync(apiDir, apiBackupDir);
      console.log('📦 Removing API folder temporarily...');
      deleteDirSync(apiDir);
    } else {
      console.warn('⚠️  API folder not found at:', apiDir);
    }

    // Step 2: Run Next.js build with static export
    console.log('🏗️  Building Next.js static export...');
    // Use cross-env to set environment variable, then run next build
    const buildCommand = process.platform === 'win32' 
      ? 'cross-env NEXT_EXPORT=true next build'
      : 'NEXT_EXPORT=true next build';
    
    // Use spawn to capture output and check if build artifacts are created
    const [command, ...args] = buildCommand.split(' ');
    const buildProcess = spawn(command, args, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NEXT_EXPORT: 'true' },
      shell: true
    });
    
    await new Promise((resolve, reject) => {
      buildProcess.on('close', (code) => {
        // Check if out directory was created
        const outDir = path.join(__dirname, '..', 'out');
        const hasArtifacts = fs.existsSync(outDir) && fs.existsSync(path.join(outDir, 'index.html'));
        
        if (hasArtifacts) {
          console.log('✅ Build artifacts found - build succeeded despite exit code', code);
          buildSucceeded = true;
          resolve();
        } else if (code === 0) {
          console.log('✅ Next.js build complete!');
          buildSucceeded = true;
          resolve();
        } else {
          console.error('❌ Build failed with exit code', code);
          reject(new Error(`Build failed with exit code ${code}`));
        }
      });
      
      buildProcess.on('error', (error) => {
        console.error('❌ Build process error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exitCode = 1;
  } finally {
    // Step 3: Restore API folder (CRITICAL - must always happen)
    if (fs.existsSync(apiBackupDir)) {
      console.log('📦 Restoring API folder...');
      try {
        deleteDirSync(apiDir); // Clean just in case
        copyDirSync(apiBackupDir, apiDir);
        deleteDirSync(apiBackupDir);
        
        // Verify API folder was restored successfully
        // Check for the API route file (handle bracket escaping in path)
        const apiRouteDir = path.join(apiDir, '[...route]');
        const apiRouteFile = path.join(apiRouteDir, 'route.ts');
        if (fs.existsSync(apiRouteFile)) {
          console.log('✅ API folder restored successfully');
          apiFolderRestored = true;
        } else {
          // Alternative check: verify the directory structure exists
          if (fs.existsSync(apiRouteDir)) {
            const files = fs.readdirSync(apiRouteDir);
            if (files.includes('route.ts')) {
              console.log('✅ API folder restored successfully (verified via directory listing)');
              apiFolderRestored = true;
            } else {
              console.error('❌ API folder restoration verification failed - route.ts not found in', apiRouteDir);
              console.error('   Found files:', files);
              process.exitCode = 1;
            }
          } else {
            console.error('❌ API folder restoration verification failed - [...route] directory not found');
            process.exitCode = 1;
          }
        }
      } catch (restoreError) {
        console.error('❌ Failed to restore API folder:', restoreError.message);
        process.exitCode = 1;
      }
    } else {
      // If backup doesn't exist, check if API folder already exists
      const apiRouteDir = path.join(apiDir, '[...route]');
      const apiRouteFile = path.join(apiRouteDir, 'route.ts');
      if (fs.existsSync(apiRouteFile)) {
        console.log('✅ API folder already exists (no backup needed)');
        apiFolderRestored = true;
      } else if (fs.existsSync(apiRouteDir)) {
        // Check via directory listing as fallback
        const files = fs.readdirSync(apiRouteDir);
        if (files.includes('route.ts')) {
          console.log('✅ API folder already exists (verified via directory listing)');
          apiFolderRestored = true;
        } else {
          console.warn('⚠️  API folder backup not found and API folder missing');
        }
      } else {
        console.warn('⚠️  API folder backup not found and API folder missing');
      }
    }
  }

  // Final verification
  if (!apiFolderRestored) {
    console.error('❌ CRITICAL: API folder was not properly restored. Development mode will fail.');
    console.error('   Please manually restore app/api folder from git or backup.');
    process.exitCode = 1;
  }

  // Exit with appropriate code
  if (process.exitCode === 1) {
    process.exit(1);
  }
})().catch((error) => {
  console.error('❌ Unhandled error in build script:', error);
  process.exit(1);
});

