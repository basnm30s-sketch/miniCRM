import { test, expect } from '@playwright/test';

test.describe('Operational Modules', () => {

    test('Expense Categories', async ({ page }) => {
        // Navigate (Assuming in Settings or dedicated page)
        await page.goto('/settings/expense-categories');
        // Or if in dropdown

        // Create Custom Category
        await page.getByRole('button', { name: 'Add Category' }).click();
        await page.locator('input[name="name"]').fill('Team Lunch');
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByText('Team Lunch')).toBeVisible();

        // Delete
        await page.getByRole('row', { name: 'Team Lunch' }).getByRole('button', { name: 'Delete' }).click();
        await page.getByRole('button', { name: 'Confirm' }).click();
    });

    test('Vehicle Transactions', async ({ page }) => {
        // Setup Vehicle
        await page.goto('/vehicles');
        await page.getByRole('button', { name: 'Add Vehicle' }).click();
        await page.getByLabel('Vehicle Number').fill('TRX-TEST');
        await page.getByRole('button', { name: 'Save' }).click();

        // Add Transaction
        await page.goto('/transactions'); // Or similar route
        await page.getByRole('button', { name: 'Add Transaction' }).click();

        // Fill Form
        await page.getByRole('combobox', { name: 'Vehicle' }).click();
        await page.getByLabel('TRX-TEST').click();

        await page.getByRole('combobox', { name: 'Type' }).click();
        await page.getByLabel('Expense').click();

        await page.getByRole('combobox', { name: 'Category' }).click();
        await page.getByLabel('Fuel').click();

        await page.locator('input[name="amount"]').fill('50.00');
        await page.locator('input[name="date"]').fill('2025-10-01');

        await page.getByRole('button', { name: 'Save' }).click();

        // Verify
        await expect(page.getByText('TRX-TEST')).toBeVisible();
        await expect(page.getByText('50.00')).toBeVisible();
    });

});
