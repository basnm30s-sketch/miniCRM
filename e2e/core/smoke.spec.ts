import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {

    test('App should launch and display Dashboard', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify Dashboard Heading
        await expect(page.getByRole('heading', { name: /iManage/i })).toBeVisible({ timeout: 5000 });

        // Page should have loaded with content
        await expect(page.locator('main')).toBeVisible();
    });

    test('Navigation menu should be accessible', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify Top Level Links
        await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Payslips' })).toBeVisible();
    });

    test('Should be able to navigate to Customers', async ({ page }) => {
        await page.goto('/customers');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible({ timeout: 5000 });
    });

});
