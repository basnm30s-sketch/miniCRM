import { test, expect } from '@playwright/test';
import {
    launchElectronApp,
    captureConsoleErrors,
    ELECTRON_BASE_URL,
} from './helpers/electron-launch';

test.describe('Electron – Screen load (Phase 1)', () => {
    let electronApp: Awaited<ReturnType<typeof launchElectronApp>>['electronApp'];
    let window: Awaited<ReturnType<typeof launchElectronApp>>['window'];
    let consoleCapture: ReturnType<typeof captureConsoleErrors>;

    test.beforeAll(async () => {
        const result = await launchElectronApp();
        electronApp = result.electronApp;
        window = result.window;
        await window.waitForLoadState('domcontentloaded');
        await new Promise((r) => setTimeout(r, 2000));
        consoleCapture = captureConsoleErrors(window);
    });

    test.afterAll(async () => {
        await electronApp.close();
    });

    async function gotoAndAssertNoErrorPage(path: string) {
        await window.goto(`${ELECTRON_BASE_URL}${path}`);
        await window.waitForLoadState('domcontentloaded');
        await expect(window.getByText('Application Error')).not.toBeVisible();
        await expect(window.getByText('Could not connect to Express server')).not.toBeVisible();
    }

    test('Loads Home (/)', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/');
        await expect(
            window.getByRole('heading', { name: 'Quotations & Invoices' }).first()
        ).toBeVisible({ timeout: 15000 });
        await expect(window.locator('main')).toBeVisible();
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Quotations', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/quotations');
        await expect(window.getByRole('heading', { name: /Quotations/i })).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Create Quote', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/quotes/create');
        await expect(
            window.locator('[data-slot="card-title"]', { hasText: 'Quote Details' }).first()
        ).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Invoices', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/invoices');
        await expect(window.getByRole('heading', { name: /Invoices/i })).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Create Invoice', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/invoices/create');
        await expect(
            window.getByRole('heading', { name: /Create invoice|New empty invoice/i }).or(
                window.getByRole('button', { name: /New empty invoice/i })
            )
        ).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Purchase Orders', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/purchase-orders');
        await expect(window.getByRole('heading', { name: /Purchase Orders/i })).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Create Purchase Order', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/purchase-orders/create');
        await expect(
            window.locator('[data-slot="card-title"]', { hasText: 'Purchase Order Details' }).first()
        ).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Customers', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/customers');
        await expect(window.getByRole('heading', { name: /Customers/i })).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Vendors', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/vendors');
        await expect(window.getByRole('heading', { name: /Vendors/i })).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Vehicles (Fleet Management)', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/vehicles');
        await expect(window.getByRole('heading', { name: /Fleet Management/i })).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Employees', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/employees');
        await expect(window.getByRole('heading', { name: /Employees/i })).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Expense Categories', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/finances/expense-categories');
        await expect(window.getByRole('heading', { name: 'Expense Categories' }).first()).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Reports', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/reports');
        await expect(window.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible({ timeout: 15000 });
        await expect(window.getByText(/Reports Dashboard|Reports Coming Soon/i).first()).toBeVisible({ timeout: 5000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Settings (Admin)', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/admin');
        await expect(window.getByRole('heading', { name: /Settings/i })).toBeVisible({ timeout: 15000 });
        await expect(window.getByText(/Company Profile/i)).toBeVisible({ timeout: 5000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Vehicle Dashboard', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/vehicle-dashboard');
        await expect(window.getByRole('heading', { name: /Vehicle Dashboard/i })).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Vehicle Finances list', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/vehicle-finances');
        await expect(window.getByRole('heading', { name: /Vehicle Finances/i })).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Vehicle Finances detail when a vehicle exists', async () => {
        consoleCapture.clearErrors();
        await window.goto(`${ELECTRON_BASE_URL}/vehicle-finances`);
        await window.waitForLoadState('domcontentloaded');
        const cardList = window.locator('div.flex-1.overflow-y-auto.space-y-2').locator('div.cursor-pointer');
        const firstCard = cardList.first();
        const hasVehicles = await firstCard.isVisible({ timeout: 5000 }).catch(() => false);
        if (hasVehicles) {
            await firstCard.click();
            await window.waitForLoadState('domcontentloaded');
            await expect(
                window.getByRole('button', { name: /Back to List/i }).or(
                    window.getByText(/Select a vehicle from the list/i)
                )
            ).toBeVisible({ timeout: 10000 });
        } else {
            await expect(window.getByText(/No vehicles found|Select a vehicle/i).first()).toBeVisible({ timeout: 5000 });
        }
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Payslips', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/payslips');
        await expect(window.getByRole('heading', { name: /Payslips/i })).toBeVisible({ timeout: 15000 });
        consoleCapture.assertNoCriticalErrors();
    });

    test('Loads Salary Calculation', async () => {
        consoleCapture.clearErrors();
        await gotoAndAssertNoErrorPage('/salary-calculation');
        await expect(window.getByRole('heading', { name: /Salary Calculation/i })).toBeVisible({ timeout: 15000 });
        await expect(window.getByText(/Step \d+ of \d+/)).toBeVisible({ timeout: 10000 });
        consoleCapture.assertNoCriticalErrors();
    });
});
