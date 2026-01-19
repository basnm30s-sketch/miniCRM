/**
 * Clean development caches for Next.js and Turbopack
 * Removes .next and node_modules/.cache directories
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

function deleteDirSync(dir) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    } catch (error) {
      console.error(`Failed to delete ${dir}:`, error.message);
      return false;
    }
  }
  return true; // Directory doesn't exist, consider it clean
}

console.log('🧹 Cleaning development caches...');

// Clean Next.js cache
const nextCacheDir = path.join(projectRoot, '.next');
if (deleteDirSync(nextCacheDir)) {
  console.log('✅ Cleared .next directory');
} else {
  console.warn('⚠️  Could not clear .next directory');
}

// Clean Turbopack cache
const turbopackCacheDir = path.join(projectRoot, 'node_modules', '.cache');
if (deleteDirSync(turbopackCacheDir)) {
  console.log('✅ Cleared node_modules/.cache directory');
} else {
  console.warn('⚠️  Could not clear node_modules/.cache directory');
}

console.log('✅ Development cache cleanup complete!');
console.log('   You can now run "npm run dev" to start with a clean cache.');
