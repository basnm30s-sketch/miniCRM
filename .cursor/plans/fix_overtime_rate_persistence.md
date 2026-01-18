# Fix Overtime Rate Persistence Issue

## Root Cause Analysis

The `overtimeRate` field is not being saved to or retrieved from the database, even though:
- The database schema includes the `overtimeRate` column (REAL type)
- The form correctly sets `overtimeRate` in the Employee object (line 172 in `app/employees/page.tsx`)
- The form correctly tries to load `overtimeRate` when editing (line 118 in `app/employees/page.tsx`)

**The Problem**: The `employeesAdapter` in `api/adapters/sqlite.ts` is missing `overtimeRate` in all four CRUD operations:
1. `getAll()` - Not mapping `overtimeRate` from database rows (line 337-347)
2. `getById()` - Not mapping `overtimeRate` from database row (line 360-370)
3. `create()` - Not including `overtimeRate` in INSERT statement (line 385-398)
4. `update()` - Not including `overtimeRate` in UPDATE statement (line 414-426)

## Impact Analysis

### Files Affected
- **Primary**: `api/adapters/sqlite.ts` - `employeesAdapter` methods need `overtimeRate` added

### Data Flow Issue
```
Form (page.tsx) → Employee object with overtimeRate ✓
  ↓
saveEmployee() → API client ✓
  ↓
employeesAdapter.create/update() → Missing overtimeRate ✗
  ↓
Database → overtimeRate column exists but not populated ✗
  ↓
employeesAdapter.getById/getAll() → Missing overtimeRate in mapping ✗
  ↓
Form (page.tsx) → overtimeRate appears blank ✗
```

### No Changes Needed
- Database schema - `overtimeRate` column already exists
- Form component (`app/employees/page.tsx`) - Already handles `overtimeRate` correctly
- Type definitions (`lib/types.ts`) - `overtimeRate` is already defined
- Employee interface - Already includes `overtimeRate?: number`

## Changes Required

### 1. Update `getAll()` method
**File**: `api/adapters/sqlite.ts` (line 337-347)

Add `overtimeRate` to the returned object mapping:
```typescript
return rows.map((row: any) => ({
  id: row.id,
  name: row.name,
  employeeId: row.employeeId || '',
  role: row.role || '',
  paymentType: (row.paymentType != null && row.paymentType !== '') ? String(row.paymentType) : undefined,
  hourlyRate: row.hourlyRate || 0,
  salary: row.salary || 0,
  overtimeRate: row.overtimeRate != null ? row.overtimeRate : undefined,  // ADD THIS
  bankDetails: row.bankDetails || '',
  createdAt: row.createdAt,
}))
```

### 2. Update `getById()` method
**File**: `api/adapters/sqlite.ts` (line 360-370)

Add `overtimeRate` to the returned object:
```typescript
return {
  id: row.id,
  name: row.name,
  employeeId: row.employeeId || '',
  role: row.role || '',
  paymentType: (row.paymentType != null && row.paymentType !== '') ? String(row.paymentType) : undefined,
  hourlyRate: row.hourlyRate || 0,
  salary: row.salary || 0,
  overtimeRate: row.overtimeRate != null ? row.overtimeRate : undefined,  // ADD THIS
  bankDetails: row.bankDetails || '',
  createdAt: row.createdAt,
}
```

### 3. Update `create()` method
**File**: `api/adapters/sqlite.ts` (line 384-398)

Add `overtimeRate` to INSERT statement and parameters:
```typescript
const stmt = db.prepare(`
  INSERT INTO employees (id, name, employeeId, role, paymentType, hourlyRate, salary, overtimeRate, bankDetails, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
stmt.run(
  data.id,
  data.name,
  data.employeeId || '',
  data.role || '',
  data.paymentType != null ? data.paymentType : null,
  data.hourlyRate || 0,
  data.salary || 0,
  data.overtimeRate != null ? data.overtimeRate : null,  // ADD THIS
  data.bankDetails || '',
  now
)
```

### 4. Update `update()` method
**File**: `api/adapters/sqlite.ts` (line 412-426)

Add `overtimeRate` to UPDATE statement and parameters:
```typescript
const stmt = db.prepare(`
  UPDATE employees 
  SET name = ?, employeeId = ?, role = ?, paymentType = ?, hourlyRate = ?, salary = ?, overtimeRate = ?, bankDetails = ?
  WHERE id = ?
`)
stmt.run(
  data.name,
  data.employeeId || '',
  data.role || '',
  data.paymentType != null ? data.paymentType : null,
  data.hourlyRate || 0,
  data.salary || 0,
  data.overtimeRate != null ? data.overtimeRate : null,  // ADD THIS
  data.bankDetails || '',
  id
)
```

## Implementation Steps

1. Update `getAll()` to map `overtimeRate` from database rows
2. Update `getById()` to map `overtimeRate` from database row
3. Update `create()` to include `overtimeRate` in INSERT statement and parameters
4. Update `update()` to include `overtimeRate` in UPDATE statement and parameters
5. Test by creating/editing an employee with overtime rate to verify persistence

## Testing Verification

After implementation, verify:
1. Create new employee with overtime rate → Save → Edit → Overtime rate should be populated
2. Edit existing employee → Add/update overtime rate → Save → Edit again → Overtime rate should persist
3. Edit employee → Clear overtime rate → Save → Edit again → Field should be empty (not show old value)
