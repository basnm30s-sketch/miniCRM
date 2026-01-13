# Data Persistence and Version Control Implementation Plan

## Executive Summary

This plan addresses two critical requirements for Electron build distribution:
1. **Data Persistence**: Preserve user data across app updates/reinstalls
2. **Version Control**: Track app versions and handle schema migrations

## Current State Analysis

### Data Storage Issues

**Problem:**
- Database location: `process.cwd()/data/imanage.db` (inside app directory)
- Uploads: `process.cwd()/data/uploads/`
- Branding: `process.cwd()/data/branding/`
- **Critical Issue**: `process.cwd()` in Electron points to the app installation directory
- When app is reinstalled, entire app directory is replaced → **DATA LOST**

**Current Behavior:**
- ✅ Works during development
- ✅ Works for single install
- ❌ **Data lost on reinstall/update**
- ❌ No version tracking
- ❌ No migration system

### Version Tracking Issues

**Problem:**
- Version exists in `package.json` (`"version": "1.0.0"`) but:
  - Not stored in database
  - Not displayed in UI
  - Not used for migrations
  - No schema version tracking

## Impact Analysis

### Data Persistence Impact

**High Priority - Data Loss Prevention:**
- **Current Risk**: Customer loses all data on every update
- **Business Impact**: Customer frustration, data loss, support burden
- **Technical Impact**: Need to move data outside app directory

**Solution Impact:**
- ✅ Data persists across updates
- ✅ Professional user experience
- ✅ Enables safe updates
- ⚠️ Requires migration logic for existing installations

### Version Control Impact

**Medium Priority - Future-Proofing:**
- **Current Risk**: Cannot safely update database schema
- **Business Impact**: Limited ability to add features requiring schema changes
- **Technical Impact**: Need migration system

**Solution Impact:**
- ✅ Safe schema updates
- ✅ Version tracking
- ✅ Migration path for schema changes
- ✅ Better debugging (know which version customer has)

## Implementation Plan

### Phase 1: Data Persistence (Critical)

#### 1.1 Update Database Path to UserData Directory

**File: `lib/database.ts`**

**Changes:**
- Detect Electron environment
- Use `app.getPath('userData')` in Electron (persists across installs)
- Fallback to `process.cwd()/data/` for development/web
- Create helper function to get data directory

**Location Mapping:**
- **Windows**: `%APPDATA%/iManage/` (e.g., `C:\Users\Username\AppData\Roaming\iManage\`)
- **macOS**: `~/Library/Application Support/iManage/`
- **Linux**: `~/.config/iManage/`
- **Development**: `./data/` (project folder)

**Implementation:**
```typescript
function getDataDirectory(): string {
  // In Electron, use userData directory (persists across installs)
  if (typeof process !== 'undefined' && process.versions.electron) {
    // This will be set by Electron main process via environment variable
    const userDataPath = process.env.ELECTRON_USER_DATA
    if (userDataPath) {
      return path.join(userDataPath, 'data')
    }
  }
  // Fallback to project folder for development/web
  return path.join(process.cwd(), 'data')
}
```

#### 1.2 Update File Upload Paths

**Files:**
- `api/server.ts` (upload handling)
- Any file storage utilities

**Changes:**
- Use same `getDataDirectory()` helper
- Store uploads in `{userData}/data/uploads/`
- Store branding in `{userData}/data/branding/`

#### 1.3 Data Migration on First Run

**File: `lib/database.ts` or new `lib/migration.ts`**

**Logic:**
1. Check if old data location exists (`process.cwd()/data/`)
2. Check if new data location exists (`userData/data/`)
3. If old exists and new doesn't:
   - Copy database file
   - Copy uploads directory
   - Copy branding directory
   - Log migration success
4. If both exist:
   - Prefer new location (already migrated)
   - Optionally backup old location

**Migration Steps:**
```typescript
async function migrateDataFromOldLocation() {
  const oldDataDir = path.join(process.cwd(), 'data')
  const newDataDir = getDataDirectory()
  
  if (!fs.existsSync(oldDataDir)) return // No old data
  
  if (fs.existsSync(newDataDir)) {
    console.log('Data already migrated to userData')
    return // Already migrated
  }
  
  // Perform migration
  console.log('Migrating data from old location to userData...')
  // Copy database, uploads, branding
}
```

#### 1.4 Update Electron Main Process

**File: `electron/main.js`**

**Changes:**
- Set `ELECTRON_USER_DATA` environment variable before starting API server
- Pass userData path to API server process
- Ensure data directory exists before starting server

**Implementation:**
```javascript
// In startApiServer function
const userDataPath = app.getPath('userData')
const env = {
  ...process.env,
  PORT: '3001',
  NODE_ENV: isDev ? 'development' : 'production',
  ELECTRON_USER_DATA: userDataPath, // Pass to API server
  ELECTRON_RUN_AS_NODE: '1',
}
```

### Phase 2: Version Control (Important)

#### 2.1 Add Version Table to Database

**File: `lib/database.ts` (createTables function)**

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL
)
```

**Initial Data:**
- `app_version`: From `package.json`
- `schema_version`: Track database schema version (start at 1)
- `migrated_at`: Timestamp of last migration

#### 2.2 Version Management Functions

**File: `lib/version.ts` (new file)**

**Functions:**
- `getAppVersion()`: Read from package.json
- `getDatabaseVersion()`: Read from database
- `setDatabaseVersion(version)`: Update in database
- `getSchemaVersion()`: Get current schema version
- `setSchemaVersion(version)`: Update schema version
- `checkVersionMismatch()`: Compare app vs database version

#### 2.3 Migration System

**File: `lib/migrations.ts` (new file)**

**Structure:**
```typescript
interface Migration {
  version: number
  name: string
  up: (db: Database) => Promise<void>
  down?: (db: Database) => Promise<void> // For rollback
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (db) => {
      // Already handled by createTables
    }
  },
  {
    version: 2,
    name: 'add_version_tracking',
    up: async (db) => {
      // Add app_metadata table
      // Set initial versions
    }
  },
  // Future migrations here
]
```

**Migration Runner:**
- Check current schema version
- Run pending migrations in order
- Update schema version after each migration
- Log migration results

#### 2.4 Version Display in UI

**File: `app/admin/page.tsx` or new settings page**

**Display:**
- App version (from package.json)
- Database version (from database)
- Schema version (from database)
- Last migration date

**Location:**
- Settings/About page
- Or footer in admin section

### Phase 3: Integration and Testing

#### 3.1 Update Build Process

**File: `package.json`**

**Changes:**
- Ensure version is updated before each build
- Consider using semantic versioning (MAJOR.MINOR.PATCH)
- Version should be in sync with database schema version

#### 3.2 Migration Testing

**Test Scenarios:**
1. Fresh install (no old data)
2. Update from old version (with old data location)
3. Update from new version (already migrated)
4. Multiple consecutive updates
5. Rollback scenario (if needed)

#### 3.3 Documentation

**Files to Update:**
- `docs/CURRENT_STATE.md`: Update data storage section
- `docs/ELECTRON_BUILD_ISSUES.md`: Add data persistence section
- Create `docs/VERSION_CONTROL.md`: Migration guide

## Implementation Details

### File Structure Changes

```
lib/
  ├── database.ts          # Updated: Use userData path
  ├── version.ts           # NEW: Version management
  ├── migrations.ts        # NEW: Migration system
  └── migration-utils.ts   # NEW: Migration helpers

electron/
  └── main.js              # Updated: Pass userData to API server

api/
  └── server.ts             # Updated: Use userData for uploads

data/                       # OLD: Will be migrated
  ├── imanage.db
  ├── uploads/
  └── branding/

{userData}/                 # NEW: Persistent location
  └── data/
      ├── imanage.db
      ├── uploads/
      └── branding/
```

### Database Schema Changes

**New Table: `app_metadata`**
```sql
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
)
```

**Initial Records:**
- `app_version`: "1.0.0" (from package.json)
- `schema_version`: "1" (initial schema)
- `migrated_at`: Current timestamp

### Migration Flow

```
App Startup
    ↓
Check if old data exists
    ↓
Yes → Migrate to userData
    ↓
Initialize Database
    ↓
Check Schema Version
    ↓
Run Pending Migrations
    ↓
Update Schema Version
    ↓
App Ready
```

## Risk Assessment

### High Risk Areas

1. **Data Migration Failure**
   - **Risk**: Data loss during migration
   - **Mitigation**: 
     - Backup old data before migration
     - Verify migration success
     - Keep old data until confirmed working

2. **Path Resolution Issues**
   - **Risk**: Wrong path in different environments
   - **Mitigation**:
     - Test in dev, production, and packaged builds
     - Use Electron's `app.getPath()` API
     - Add logging for path resolution

3. **Migration Conflicts**
   - **Risk**: Multiple migrations running simultaneously
   - **Mitigation**:
     - Use database locks
     - Check migration status before running
     - Idempotent migrations

### Medium Risk Areas

1. **Version Mismatch**
   - **Risk**: App version doesn't match database expectations
   - **Mitigation**:
     - Clear error messages
     - Version compatibility checks
     - Migration rollback capability

2. **File Permissions**
   - **Risk**: Cannot write to userData directory
   - **Mitigation**:
     - Check permissions on startup
     - Create directory with proper permissions
     - Fallback to alternative location if needed

## Testing Checklist

### Data Persistence Tests

- [ ] Fresh install creates data in userData
- [ ] Old data location is detected
- [ ] Migration copies database successfully
- [ ] Migration copies uploads successfully
- [ ] Migration copies branding successfully
- [ ] Data persists after app reinstall
- [ ] Data persists after app update
- [ ] Multiple updates don't duplicate data

### Version Control Tests

- [ ] Version is stored in database on first run
- [ ] Version is updated on app update
- [ ] Schema version tracks correctly
- [ ] Migrations run in correct order
- [ ] Migrations are idempotent (can run multiple times)
- [ ] Version is displayed in UI
- [ ] Version mismatch is detected

### Integration Tests

- [ ] Development mode still uses project folder
- [ ] Electron build uses userData
- [ ] Web build uses project folder
- [ ] All file operations use correct paths
- [ ] Database operations work after migration
- [ ] Uploads work after migration

## Rollout Strategy

### Phase 1: Data Persistence (Week 1)
1. Implement userData path resolution
2. Implement data migration
3. Test with fresh install
4. Test with existing install (migration)

### Phase 2: Version Control (Week 2)
1. Add version table
2. Implement version tracking
3. Implement migration system
4. Add version display in UI

### Phase 3: Testing & Documentation (Week 3)
1. Comprehensive testing
2. Update documentation
3. Create migration guide
4. Prepare for release

## Success Criteria

### Data Persistence
- ✅ Data survives app reinstall
- ✅ Data survives app update
- ✅ Migration works for existing users
- ✅ No data loss during migration

### Version Control
- ✅ Version tracked in database
- ✅ Schema version tracked
- ✅ Migrations run automatically
- ✅ Version visible in UI

## Future Enhancements

1. **Automatic Updates**: Use Electron's auto-updater with version checks
2. **Backup System**: Automatic backups before migrations
3. **Migration UI**: Show migration progress to user
4. **Rollback**: Ability to rollback to previous version
5. **Version History**: Track all version changes in database

## Files to Modify

### Core Files
1. `lib/database.ts` - Update path resolution, add version table
2. `electron/main.js` - Pass userData to API server
3. `api/server.ts` - Update upload paths

### New Files
1. `lib/version.ts` - Version management
2. `lib/migrations.ts` - Migration system
3. `lib/migration-utils.ts` - Migration helpers

### Documentation
1. `docs/CURRENT_STATE.md` - Update data storage section
2. `docs/ELECTRON_BUILD_ISSUES.md` - Add data persistence
3. `docs/VERSION_CONTROL.md` - New migration guide

## Estimated Effort

- **Data Persistence**: 2-3 days
- **Version Control**: 2-3 days
- **Testing**: 2-3 days
- **Documentation**: 1 day
- **Total**: ~1.5-2 weeks

## Dependencies

- Electron `app.getPath()` API (already available)
- File system operations (fs module)
- Database migration logic
- Version comparison utilities

## Notes

- This is a **breaking change** for data location
- Existing users will need migration on first run
- Consider creating a migration tool/script for manual migration if needed
- Test thoroughly before releasing to customers





