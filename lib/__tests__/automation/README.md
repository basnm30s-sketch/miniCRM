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
