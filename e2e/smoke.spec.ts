import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical Paths', () => {

    test.beforeEach(async ({ page }) => {
        // Basic connectivity check - Go to Dashboard
        await page.goto('/');
    });

    test('App should launch and display Dashboard', async ({ page }) => {
        // Verify Title
        await expect(page).toHaveTitle(/iManage/);

        // Verify Dashboard Heading
        await expect(page.getByRole('heading', { name: 'iManage' })).toBeVisible();

        // Verify Stats Widgets (Database connection check)
        const statsGrid = page.locator('.grid.gap-4').first();
        await expect(statsGrid).toBeVisible();

        // Check for at least one metric card
        await expect(page.locator('text=Total Revenue')).toBeVisible();
    });

    test('Navigation menu should be accessible', async ({ page }) => {
        // Verify Top Level Links
        await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Payslips' })).toBeVisible();

        // Expand Doc Generator
        await page.getByText('Doc Generator').click();
        await expect(page.getByRole('link', { name: 'Quotations' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Invoices' })).toBeVisible();

        // Expand Masters
        await page.getByText('Masters').click();
        await expect(page.getByRole('link', { name: 'Customers' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Vehicles' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Employees' })).toBeVisible();
    });

    test('Should be able to navigate to Quotes and back', async ({ page }) => {
        // Expand Doc Generator if needed (it might stay open, but safe to click if closed)
        // Check if visible first to avoid closing it if valid
        if (!(await page.getByRole('link', { name: 'Quotations' }).isVisible())) {
            await page.getByText('Doc Generator').click();
        }

        await page.getByRole('link', { name: 'Quotations' }).click();
        await expect(page).toHaveURL(/.*quotations/);
        await expect(page.getByRole('heading', { name: 'Quotations' })).toBeVisible();

        // Go back to Dashboard
        await page.getByRole('link', { name: 'Home' }).click();
        await expect(page).toHaveURL('/');
    });

});
