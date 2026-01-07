# Test Cases Update Plan - Vehicle Finances Module

## Overview
This plan outlines the unit test cases needed for the Vehicle Finances module, following the existing test patterns in the codebase. All tests will use Jest and supertest, following the same structure as existing API route tests.

## Current Test Coverage Status

### Existing Test Files (13 modules)
1. ✅ Core Content Validation (`lib/__tests__/validation.test.ts`)
2. ✅ General Utilities (`lib/__tests__/utils.test.ts`)
3. ✅ Quotes API (`api/__tests__/quotes.test.ts`)
4. ✅ Invoices API (`api/__tests__/invoices.test.ts`)
5. ✅ Customers API (`api/__tests__/customers.test.ts`)
6. ✅ Payslips API (`api/__tests__/payslips.test.ts`)
7. ✅ Purchase Orders API (`api/__tests__/purchase-orders.test.ts`)
8. ✅ Vehicles API (`api/__tests__/vehicles.test.ts`) - **Missing profitability endpoint**
9. ✅ Employees API (`api/__tests__/employees.test.ts`)
10. ✅ Vendors API (`api/__tests__/vendors.test.ts`)
11. ✅ Admin Settings API (`api/__tests__/admin.test.ts`)
12. ✅ Uploads & Storage (`api/__tests__/uploads.test.ts`)
13. ✅ Document Renderers (`lib/__tests__/renderers.test.ts`)

### Missing Test Files (Vehicle Finances Module)
1. ❌ **Vehicle Transactions API** (`api/__tests__/vehicle-transactions.test.ts`) - **NEW**
2. ❌ **Expense Categories API** (`api/__tests__/expense-categories.test.ts`) - **NEW**
3. ⚠️ **Vehicles API** (`api/__tests__/vehicles.test.ts`) - **Missing profitability endpoint test**
4. ❌ **Dashboard Metrics Endpoint** - **Special route, needs integration test**

## Test Implementation Plan

### Module 1: Vehicle Transactions API Tests
**File:** `api/__tests__/vehicle-transactions.test.ts`

**Test Structure:**
```typescript
import request from 'supertest'
import express from 'express'
import vehicleTransactionsRouter from '../routes/vehicle-transactions'

// Mock adapters
jest.mock('../adapters/sqlite', () => ({
  vehicleTransactionsAdapter: {
    getAll: jest.fn(),
    getById: jest.fn(),
    getByVehicleId: jest.fn(),
    getByVehicleIdAndMonth: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  vehiclesAdapter: {
    getById: jest.fn(),
  },
  employeesAdapter: {
    getById: jest.fn(),
  },
}))
```

**Test Coverage:**

#### GET /api/vehicle-transactions
- ✅ Return all transactions (200)
- ✅ Filter by vehicleId query parameter (200)
- ✅ Filter by vehicleId and month query parameters (200)
- ✅ Handle errors (500)

#### GET /api/vehicle-transactions/:id
- ✅ Return transaction by id (200)
- ✅ Return 404 if transaction not found
- ✅ Handle errors (500)

#### POST /api/vehicle-transactions
- ✅ Create new transaction (201)
- ✅ Validation: vehicle does not exist (400)
- ✅ Validation: amount must be positive (400)
- ✅ Validation: date cannot be in future (400)
- ✅ Validation: date cannot be more than 12 months in past (400)
- ✅ Validation: employee does not exist (400)
- ✅ Handle general errors (500)

#### PUT /api/vehicle-transactions/:id
- ✅ Update transaction (200)
- ✅ Return 404 if transaction not found
- ✅ Validation: same validations as POST (400)
- ✅ Handle errors (500)

#### DELETE /api/vehicle-transactions/:id
- ✅ Delete transaction (204)
- ✅ Handle errors (500)

**Mock Requirements:**
- Mock `vehicleTransactionsAdapter` with all methods
- Mock `vehiclesAdapter.getById` for vehicle existence validation
- Mock `employeesAdapter.getById` for employee existence validation

---

### Module 2: Expense Categories API Tests
**File:** `api/__tests__/expense-categories.test.ts`

**Test Structure:**
```typescript
import request from 'supertest'
import express from 'express'
import expenseCategoriesRouter from '../routes/expense-categories'

// Mock adapter
jest.mock('../adapters/sqlite', () => ({
  expenseCategoriesAdapter: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))
```

**Test Coverage:**

#### GET /api/expense-categories
- ✅ Return all categories (200)
- ✅ Handle errors (500)

#### GET /api/expense-categories/:id
- ✅ Return category by id (200)
- ✅ Return 404 if category not found
- ✅ Handle errors (500)

#### POST /api/expense-categories
- ✅ Create new category (201)
- ✅ Validation: name is required (400)
- ✅ Validation: UNIQUE constraint violation (400)
- ✅ Handle errors (500)

#### PUT /api/expense-categories/:id
- ✅ Update category (200)
- ✅ Return 404 if category not found
- ✅ Validation: UNIQUE constraint violation (400)
- ✅ Handle errors (500)

#### DELETE /api/expense-categories/:id
- ✅ Delete category (204)
- ✅ Return 409 if category is referenced (Cannot delete)
- ✅ Handle errors (500)

**Mock Requirements:**
- Mock `expenseCategoriesAdapter` with all methods

---

### Module 3: Vehicle Profitability Endpoint Tests
**File:** `api/__tests__/vehicles.test.ts` (extend existing)

**Additional Test Coverage:**

#### GET /api/vehicles/:id/profitability
- ✅ Return profitability data for vehicle (200)
- ✅ Return 404 if vehicle not found
- ✅ Verify profitability structure:
  - `currentMonth` object exists
  - `lastMonth` object exists
  - `allTimeRevenue` is a number
  - `allTimeExpenses` is a number
  - `allTimeProfit` is calculated correctly (revenue - expenses)
  - `months` array contains 12 months (rolling window)
- ✅ Verify month normalization (YYYY-MM format)
- ✅ Verify months array is sorted correctly
- ✅ Handle errors (500)

**Mock Requirements:**
- Mock `vehiclesAdapter.getById` for vehicle existence check
- Mock `vehicleTransactionsAdapter.getProfitabilityByVehicle` to return profitability summary
- Mock should return data with proper structure matching `VehicleProfitabilitySummary` interface

**Test Data Structure:**
```typescript
const mockProfitability = {
  vehicleId: 'vehicle-1',
  currentMonth: {
    vehicleId: 'vehicle-1',
    month: '2026-01',
    totalRevenue: 10000,
    totalExpenses: 5000,
    profit: 5000,
    transactionCount: 5,
  },
  lastMonth: {
    vehicleId: 'vehicle-1',
    month: '2025-12',
    totalRevenue: 9500,
    totalExpenses: 4800,
    profit: 4700,
    transactionCount: 4,
  },
  allTimeRevenue: 120000,
  allTimeExpenses: 60000,
  allTimeProfit: 60000,
  months: [
    // 12 months of data
  ],
}
```

---

### Module 4: Dashboard Metrics Endpoint Tests
**File:** `api/__tests__/vehicle-finances.test.ts` (new file)

**Note:** This endpoint is handled in `app/api/[...route]/route.ts` as a special route. We need to test it via the Next.js API route handler or create a separate Express router test.

**Test Approach Options:**
1. **Option A:** Test via Next.js API route (requires Next.js test setup)
2. **Option B:** Extract dashboard logic to a separate Express router and test that
3. **Option C:** Test the adapter method directly (`getDashboardMetrics`)

**Recommended: Option C** - Test the adapter method directly since it contains the business logic.

**Test Structure:**
```typescript
import { vehicleTransactionsAdapter } from '../adapters/sqlite'

// Mock database and other adapters
jest.mock('../../lib/database', () => ({
  getDatabase: jest.fn(),
}))
jest.mock('../adapters/sqlite', () => ({
  vehicleTransactionsAdapter: {
    getAll: jest.fn(),
    getDashboardMetrics: jest.fn(),
  },
  vehiclesAdapter: {
    getAll: jest.fn(),
  },
}))
```

**Test Coverage:**

#### getDashboardMetrics() Adapter Method
- ✅ Return dashboard metrics structure
- ✅ Verify metrics structure:
  - `vehicleBased` object with:
    - `totalVehicles` count
    - `totalRevenue`, `totalExpenses`, `totalProfit`
    - `topByRevenue` array (top 5)
    - `bottomByProfit` array (bottom 5)
  - `customerBased` object with:
    - `totalUnique` customers
    - `topByRevenue` array
    - `avgRevenuePerCustomer` calculation
  - `categoryBased` object with:
    - `revenueByCategory` object
    - `expensesByCategory` object
    - `topExpenseCategory` object
  - `operational` object with:
    - `revenuePerVehiclePerMonth` calculation
    - `expenseRatio` calculation
    - `mostActiveVehicle` object
    - `avgTransactionsPerVehicle` calculation
- ✅ Handle empty data gracefully
- ✅ Handle errors gracefully

**Alternative: Integration Test for API Route**
If testing the API route directly:
- ✅ GET /api/vehicle-finances/dashboard returns metrics (200)
- ✅ Handle errors (500)

---

## Implementation Details

### Test Pattern (Following Existing Tests)
All tests follow this pattern:
1. Use `supertest` for HTTP testing
2. Use `express` to create test app
3. Mock adapters using `jest.mock`
4. Test success cases (200, 201, 204)
5. Test error cases (400, 404, 409, 500)
6. Use `beforeEach` to clear mocks
7. Verify adapter method calls with `toHaveBeenCalledWith`

### Key Test Scenarios

1. **Month Normalization** - Ensure months are in YYYY-MM format
2. **Rolling 12 Months** - Verify profitability returns last 12 months from current date
3. **Date Validation** - Test 12-month backdating limit and no future dates
4. **Amount Validation** - Ensure all amounts are positive
5. **Vehicle/Employee References** - Test foreign key validation
6. **Category Uniqueness** - Test UNIQUE constraint handling
7. **Dashboard Aggregations** - Verify correct calculation of totals, averages, top/bottom lists
8. **Query Parameter Filtering** - Test vehicleId and month filters

### Files to Create/Modify

1. **NEW:** `api/__tests__/vehicle-transactions.test.ts`
2. **NEW:** `api/__tests__/expense-categories.test.ts`
3. **MODIFY:** `api/__tests__/vehicles.test.ts` (add profitability endpoint tests)
4. **NEW:** `api/__tests__/vehicle-finances.test.ts` (for dashboard metrics - adapter method test)

### Dependencies
- All dependencies already exist (Jest, supertest, ts-jest)
- No new packages needed

## Test Execution
Run tests using: `npm test`

All tests should follow the existing patterns and integrate seamlessly with the current test suite.

## Success Criteria

1. ✅ All 4 test files created/updated
2. ✅ All test cases pass
3. ✅ Test coverage matches existing test patterns
4. ✅ Tests handle edge cases (empty data, errors, validation)
5. ✅ Tests verify data structure and calculations
6. ✅ Tests integrate with existing test suite

## Estimated Test Count

- **Vehicle Transactions API:** ~15 test cases
- **Expense Categories API:** ~12 test cases
- **Vehicle Profitability Endpoint:** ~8 test cases
- **Dashboard Metrics:** ~10 test cases

**Total:** ~45 new test cases




