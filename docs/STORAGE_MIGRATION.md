# Storage Migration Guide

## Current Status

The application currently uses **localStorage** for data persistence, which works in both browser and Electron environments. This ensures backward compatibility and allows the app to work immediately without requiring native build tools.

## SQLite Support (Future Enhancement)

SQLite support has been prepared but is **not yet active**. The infrastructure is in place:

- ✅ Database module (`lib/database.ts`) - SQLite schema and initialization
- ✅ Electron IPC handlers (prepared in `electron/preload.js`)
- ✅ Storage adapter pattern (`lib/storage-adapter.ts`)

## Why localStorage is Still Used

1. **No Build Tools Required**: better-sqlite3 requires Visual Studio Build Tools on Windows
2. **Backward Compatibility**: Existing data in localStorage continues to work
3. **Cross-Platform**: Works in browser development and Electron without changes
4. **Simplicity**: No IPC complexity needed for basic operations

## When to Enable SQLite

Consider enabling SQLite when:
- You have Visual Studio Build Tools installed
- You need better data reliability (SQLite is more robust than localStorage)
- You want to support larger datasets
- You need database features (queries, transactions, etc.)

## How to Enable SQLite (Future)

1. Install build tools and better-sqlite3:
   ```bash
   npm install better-sqlite3 @types/better-sqlite3
   ```

2. Update `lib/storage.ts` to use the storage adapter:
   - Replace localStorage calls with adapter calls
   - The adapter will automatically use SQLite in Electron

3. Add IPC handlers in `electron/main.js`:
   - Handle storage operations via IPC
   - Use SQLite database in main process

4. Test thoroughly:
   - Verify data migration from localStorage
   - Test all CRUD operations
   - Ensure backward compatibility

## Current Storage Location

- **Browser/Development**: Browser's localStorage
- **Electron (when SQLite enabled)**: `%APPDATA%/iManage/imanage.db` (Windows)

## Data Persistence

Current localStorage implementation:
- ✅ Works offline
- ✅ Persists between sessions
- ✅ No external dependencies
- ✅ Fast and simple
- ⚠️ Limited to ~5-10MB (browser dependent)
- ⚠️ Can be cleared by user/browser

SQLite benefits (when enabled):
- ✅ No size limits
- ✅ More reliable
- ✅ Better performance for large datasets
- ✅ Transaction support
- ✅ Query capabilities

## Recommendation

**For now**: Continue using localStorage. It works perfectly for the current use case and doesn't require any build tools.

**Later**: Enable SQLite when you're ready to install build tools and want the additional benefits.

