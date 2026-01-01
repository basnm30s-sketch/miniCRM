# Automation Testing Implementation

## Overview
We have established a Unit Regression Testing framework using **Jest**. This ensures the stability of core business logic and utility functions.

## Technology Stack
- **Framework:** Jest
- **Environment:** Node.js (via `jest-environment-node`)
- **Language:** TypeScript (`ts-jest`)

## Folder Structure
Tests are co-located with the code they test, inside `__tests__` directories:

- `lib/__tests__/`: Unit tests for utilities and business logic.
- `api/__tests__/`: Unit tests for backend API handlers (Planned).

## Current Implementation status
### Module 1: Core Content Validation
**Status:** ✅ Completed
**File:** `lib/__tests__/validation.test.ts`
**Coverage:**
- `validateQuote`: Verified synchronous checks and async storage calls (mocked).
- `validateInvoice`: Verified synchronous checks and async storage calls (mocked).
- Helper functions: `isPositiveNumber`, `isNonEmptyString`, `isValidDate`.

### Module 2: General Utilities
**Status:** ✅ Completed
**File:** `lib/__tests__/utils.test.ts`
**Coverage:**
- `cn`: Verified class merging, conditional classes, and Tailwind conflict resolution.

### Module 3: Backend API Logic
**Status:** ✅ Completed
**File:** `api/__tests__/quotes.test.ts`
**Coverage:**
- `GET /quotes`: Verified list retrieval (mocked DB).
- `GET /quotes/:id`: Verified single item retrieval and 404 handling.
- `POST /quotes`: Verified creation logic.

### Module 14: Vehicle Transactions API
**Status:** ✅ Completed
**File:** `api/__tests__/vehicle-transactions.test.ts`
**Coverage:**
- `GET /vehicle-transactions`: Verified list retrieval with filtering (by vehicleId, by vehicleId and month).
- `GET /vehicle-transactions/:id`: Verified single transaction retrieval and 404 handling.
- `POST /vehicle-transactions`: Verified creation with validation (vehicle existence, positive amounts, date constraints, employee existence).
- `PUT /vehicle-transactions/:id`: Verified update logic with validation.
- `DELETE /vehicle-transactions/:id`: Verified deletion logic.

### Module 15: Expense Categories API
**Status:** ✅ Completed
**File:** `api/__tests__/expense-categories.test.ts`
**Coverage:**
- `GET /expense-categories`: Verified list retrieval.
- `GET /expense-categories/:id`: Verified single category retrieval and 404 handling.
- `POST /expense-categories`: Verified creation with validation (name required, unique constraint).
- `PUT /expense-categories/:id`: Verified update logic with unique constraint validation.
- `DELETE /expense-categories/:id`: Verified deletion with reference checking.

### Module 8: Vehicles API (Extended)
**Status:** ✅ Completed
**File:** `api/__tests__/vehicles.test.ts` (Extended)
**Coverage:**
- `GET /vehicles/:id/profitability`: Verified profitability data retrieval, structure validation, month normalization (YYYY-MM format), and error handling.

### Module 16: Vehicle Finances Dashboard Metrics
**Status:** ✅ Completed
**File:** `api/__tests__/vehicle-finances.test.ts`
**Coverage:**
- `getDashboardMetrics()`: Verified dashboard metrics structure, overall metrics calculation, vehicle-based metrics, customer-based metrics, category-based metrics, operational metrics, time-based metrics, empty data handling, and error handling.

## How to Run Tests
Run the following command in the terminal:
```bash
npm test
```
This will execute all test suites matching the configuration.

## Strategic Decision: Jest vs Playwright

### Why Jest was chosen for Phase 1
We selected **Jest** for the initial Unit Regression phase because:
1.  **Speed:** Jest runs in a Node.js environment, avoiding the overhead of launching real browsers. This is crucial for unit tests which should run in milliseconds.
2.  **Mocking:** Jest has a powerful, built-in mocking library (`jest.fn()`, `jest.mock()`) that is essential for isolating business logic from external dependencies (like the database or local storage), as seen in our `validation.test.ts`.
3.  **Nature of Tests:** Our current goal is to verify *pure logic* (functions, calculations, validation rules). Playwright is designed for verifying *user interactions* and *visual rendering*.

### Technical Comparison

| Feature | Jest | Playwright |
| :--- | :--- | :--- |
| **Primary Use Case** | Unit & Integration Testing (Logic) | End-to-End Testing (User Flows) |
| **Environment** | Node.js (JSDOM optional) | Real Browser Engines (Chromium, Firefox, WebKit) |
| **Speed** | ⚡ Extremely Fast | 🐢 Slower (due to browser launch) |
| **Mocking** | First-class support (deep integration) | Network interception mainly |
| **UI Testing** | Component snapshots (shallow) | Full visual regression & user interaction |
| **Best For...** | `validateQuote()`, `calculateTotal()` | "User logs in and creates a quote" |

**Conclusion:** We use **Jest** now to build a solid foundation of logic correctness. We will add **Playwright** later to verify the full application lifecycle.
