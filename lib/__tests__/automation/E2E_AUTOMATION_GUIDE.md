# E2E Automation Guide

## Overview
This document provides a complete guide for managing the End-to-End (E2E) test suite for the iManage CRM application using Playwright.

---

## Test Suite Structure

The E2E suite is split into two categories to prioritize stability and maintenance:

### 1. Core Suite (`e2e/core/`)
**Critical Path Tests - Must Always Pass.**
Running these tests gives a high-confidence signal that the application's primary features are working.
- **Commands**: `npm run test:e2e` or `npm run test:e2e:core`
- **Includes**:
  - Smoke Tests (`e2e/core/smoke.spec.ts`)
  - Critical Flows (`e2e/core/quote-to-invoice.spec.ts`)
  - Core Modules: Customers, Invoices, Vehicles, Employees, Vendors, Admin.

### 2. Extended Suite (`e2e/extended/`)
**Additional Coverage - May Contain Known Issues.**
These tests cover more complex scenarios or features currently under stabilization.
- **Commands**: `npm run test:e2e:extended`
- **Includes**:
  - Payslips (Wizard logic)
  - Quotes (Complex UI interactions)
  - Vehicle Finances (Data loading)
  - Reports & Artifact Downloads

## Running Tests

### Standard Run (Core Only)
```bash
npm run test:e2e
```

### Full Regression (Core + Extended)
```bash
npm run test:e2e:core
npm run test:e2e:extended
```

### View Test Report
```bash
npx playwright show-report
```

---

## Test Suite Structure

```
e2e/
├── smoke.spec.ts              # Basic app health checks
├── flows/
│   └── quote-to-invoice.spec.ts   # Critical business flow
├── modules/
│   ├── customers.spec.ts      # Customer CRUD + constraints
│   ├── vehicles.spec.ts       # Vehicle management + finances
│   ├── quotes.spec.ts         # Quote lifecycle
│   ├── invoices.spec.ts       # Invoice creation
│   ├── employees.spec.ts      # Employee management
│   ├── vendors.spec.ts        # Vendor management
│   ├── payslips.spec.ts       # Salary calculation workflow
│   ├── vehicle-finances.spec.ts # Dashboard verification
│   ├── admin.spec.ts          # Settings management
│   └── reports.spec.ts        # Reports placeholder
└── artifacts/
    └── downloads.spec.ts      # PDF generation
```

---

## When to Run Tests

| Scenario | Recommended Action |
|----------|-------------------|
| **Before every commit** | Run `npm run test:e2e` (smoke only if time-constrained) |
| **Before deployment** | Full suite: `npm run test:e2e` |
| **After UI changes** | Run affected module + smoke tests |
| **After database schema changes** | Full suite |
| **CI/CD Pipeline** | Full suite on every PR |

### Recommended Strategy

1. **Development Phase**: Run specific module tests as you work
2. **Pre-PR**: Run full suite locally
3. **CI Pipeline**: Run full suite on PR merge

---

## Maintaining Tests

### Adding New Tests

1. **Create the spec file** in the appropriate directory
2. **Follow the pattern**:
   ```typescript
   import { test, expect } from '@playwright/test';

   test.describe('Module Name', () => {
       test('Test Name', async ({ page }) => {
           await page.goto('/route');
           await page.waitForLoadState('networkidle');
           // ... test steps
       });
   });
   ```

3. **Use these best practices**:
   - Always use `waitForLoadState('networkidle')` after navigation
   - Use regex in row selectors: `getByRole('row', { name: /pattern/i })`
   - Handle dialogs: `page.on('dialog', dialog => dialog.accept())`
   - Add timeouts for visibility checks: `toBeVisible({ timeout: 5000 })`

### Updating Existing Tests

When UI changes break tests:

1. **Identify the failing assertion** from the test report
2. **Check the actual UI** - selectors may have changed
3. **Update selectors** - prefer role-based over text-based:
   ```typescript
   // Good
   page.getByRole('button', { name: 'Create' })
   page.getByRole('row', { name: /pattern/i })
   
   // Avoid
   page.locator('.btn-primary')
   page.getByText('exact text')
   ```

### Common Failure Patterns

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Timeout waiting for element | Async data loading | Add `waitForLoadState('networkidle')` |
| Element not found | Selector changed | Update selector |
| Dialog not handled | Missing handler | Add `page.on('dialog', ...)` |
| Test passes locally, fails in CI | Race condition | Add explicit waits |

---

## Database Management

Tests use an isolated database (`crm_test.db`).

### Reset Database
```bash
$env:DB_FILENAME='crm_test.db'; npx tsx scripts/init-test-db.ts
```

### Important Notes
- **Never run E2E tests against production data**
- Database is automatically reset before test runs via config
- Each test should be independent (create its own data)

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Troubleshooting

### Tests are flaky
- Increase timeouts
- Add `waitForLoadState('networkidle')`
- Use `--workers=1` to run sequentially

### Cannot find element
- Open debug mode: `npx playwright test --debug`
- Check if element is in shadow DOM
- Verify selector in browser DevTools

### Database errors
- Reset: `npx tsx scripts/init-test-db.ts`
- Check `DB_FILENAME` environment variable

---

## Test Report Interpretation

After running tests, view the HTML report:
```bash
npx playwright show-report
```

- **Green** = Passed
- **Red** = Failed (click for details)
- **Yellow** = Flaky (passed on retry)

Each failure includes:
- Screenshot at failure point
- Stack trace
- Video recording (if enabled)

---

## Summary

| Task | Command |
|------|---------|
| Run all tests | `npm run test:e2e` |
| Run one test | `npx playwright test path/to/test.spec.ts` |
| Debug tests | `npx playwright test --ui` |
| View report | `npx playwright show-report` |
| Reset DB | `npx tsx scripts/init-test-db.ts` |
