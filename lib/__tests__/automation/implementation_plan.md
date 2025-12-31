# Automation Testing Implementation Plan

## Goal Description
Implement a robust automation testing framework to ensure code stability and prevent regressions. The initial focus is on unit regression cases for core logic within the application.

## User Review Required
> [!IMPORTANT]
> The project currently has no testing framework installed. I propose installing **Jest** as it is the industry standard for React/Next.js/Node.js applications.
>
> **Proposed Dependencies to Install:**
> - `jest`
> - `ts-jest`
> - `@types/jest`
> - `jest-environment-node` (for backend logic)

## Testing Strategy
### Phase 1: Unit Regression (Current Focus)
**Tool: Jest**
- **Reasoning:** Jest is the industry standard for React/Node.js unit testing. It is lightweight, fast, and offers excellent mocking capabilities, making it ideal for testing pure utility functions and business logic in `lib/` and `api/`.
- **Comparison:** While Playwright is excellent for E2E testing, it is overkill for unit testing pure functions (slower execution, requires browser context). Using Jest allows us to build a solid foundation of fast, reliable unit tests.

### Phase 2: End-to-End Testing (Future)
**Tool: Playwright**
- **Goal:** We will introduce Playwright later to test full user workflows (integration between Electron, SQLite, and UI) that Jest cannot easily cover.

## Proposed Changes

### Setup and Configuration
- [NEW] `jest.config.js`: Configuration file for Jest.
- [MODIFY] `package.json`: Add `test` script and devDependencies.

### Test Implementation
I will target pure utility functions and independent API helpers first as they are good candidates for unit regression.

### Module 1: Core Content Validation (First Target)
This module contains pure functions that validate business objects. It is the Simplest & High Value starting point.
- [NEW] `lib/__tests__/validation.test.ts`: Comprehensive unit tests for `validateQuote` and `validateInvoice`.

### Module 2: General Utilities (Future)
- [NEW] `lib/__tests__/utils.test.ts`: Tests for `cn` and other helpers.

### Module 3: Backend API Logic (Future)
- [NEW] `api/__tests__/*.test.ts`: Testing API route handlers (requires mocking DB).

## Verification Plan

### Automated Tests
- Run `npm test` to execute the newly created test suite.
- Verify that all tests pass.
- Intentionally break a piece of logic to ensure the test fails (negative testing).

### Manual Verification
- Review the test output for clarity.
