import { test, expect } from '@playwright/test';

test.describe('Invoices Module', () => {

    test('Direct Invoice Creation and Calculations', async ({ page }) => {
        // 1. Setup Customer
        await page.goto('/customers');
        await page.getByRole('button', { name: 'Add Customer' }).click();
        await page.getByLabel('Name').fill('Invoice Tester');
        await page.getByRole('button', { name: 'Save' }).click();

        // 2. Create Invoice
        await page.goto('/invoices');
        await page.getByRole('button', { name: 'Create Invoice' }).click();

        // Select Customer
        await page.getByRole('combobox').click();
        await page.getByLabel('Invoice Tester').click();

        // Add Items
        await page.getByRole('button', { name: 'Add Item' }).click();
        await page.locator('input[name="items.0.description"]').fill('Widget');
        await page.locator('input[name="items.0.quantity"]').fill('3');
        await page.locator('input[name="items.0.unitPrice"]').fill('10.50');
        // 10.50 * 3 = 31.50

        // Verify Live Calculation
        // Assuming UI updates instantly
        await expect(page.getByText('31.50')).toBeVisible();

        // Save
        await page.getByRole('button', { name: 'Save' }).click();

        // 3. Edit Invoice
        // Wait for redirect to list or details
        // Find the invoice in list (assuming top of list)
        // Click Edit on the first invoice that matches
        // await page.getByRole('row').first().getByRole('button', { name: 'Edit' }).click();

        // For now, let's just delete it to clean up and verify delete
        // Verify it exists first
        await expect(page.getByText('Invoice Tester')).toBeVisible();

        // 4. Delete
        await page.getByRole('row', { name: 'Invoice Tester' }).getByRole('button', { name: 'Delete' }).click();
        await page.getByRole('button', { name: 'Confirm' }).click();

        await expect(page.getByText('Invoice Tester')).not.toBeVisible();
    });

});
