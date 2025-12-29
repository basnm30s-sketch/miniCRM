/**
 * Build script for Electron
 * Temporarily moves the API folder out of the way during static export
 * since Next.js output: export doesn't support API routes
 */

const { execSync } = require('child_process');
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

console.log('🔧 Preparing for Electron build...');

// Step 1: Backup and remove API folder
if (fs.existsSync(apiDir)) {
  console.log('📦 Backing up API folder...');
  deleteDirSync(apiBackupDir); // Clean up any old backup
  copyDirSync(apiDir, apiBackupDir);
  console.log('📦 Removing API folder temporarily...');
  deleteDirSync(apiDir);
}

try {
  // Step 2: Run Next.js build with static export
  console.log('🏗️  Building Next.js static export...');
  execSync('cross-env NEXT_EXPORT=true next build', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NEXT_EXPORT: 'true' }
  });
  
  console.log('✅ Next.js build complete!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exitCode = 1;
} finally {
  // Step 3: Restore API folder
  if (fs.existsSync(apiBackupDir)) {
    console.log('📦 Restoring API folder...');
    deleteDirSync(apiDir); // Clean just in case
    copyDirSync(apiBackupDir, apiDir);
    deleteDirSync(apiBackupDir);
  }
}

