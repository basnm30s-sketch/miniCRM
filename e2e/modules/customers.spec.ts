import { test, expect } from '@playwright/test';

test.describe('Customers Module', () => {

    test('CRUD Operations and Constraints', async ({ page }) => {
        // CREATE
        await page.goto('/customers');
        await page.getByRole('button', { name: 'Add Customer' }).click();

        await page.getByPlaceholder('Name').fill('Acme Corp');
        await page.getByPlaceholder('Company').fill('Acme International');
        await page.getByPlaceholder('Email').fill('info@acme.com');

        await page.getByRole('button', { name: 'Create' }).click();

        // Verify
        await expect(page.getByText('Acme International')).toBeVisible();

        // EDIT
        // Target specifically the actions cell (last cell) and the first button (Edit)
        await page.getByRole('row', { name: 'Acme Corp' }).getByRole('cell').last().getByRole('button').first().click();

        await page.getByPlaceholder('Name').fill('Acme Inc');
        await page.getByRole('button', { name: 'Update' }).click();

        // Verify Update
        await expect(page.getByText('Acme Inc')).toBeVisible();

        // CONSTRAINT CHECK (Cannot delete if used)
        // 1. Create a dummy quote for this customer
        await page.goto('/quotations');
        await page.getByRole('button', { name: 'New Quotation' }).click();
        await page.getByRole('combobox').click();
        await page.getByLabel('Acme Inc').click();

        await page.getByRole('button', { name: 'Add Item' }).click();
        await page.locator('input[name="items.0.description"]').fill('Test Item');
        await page.locator('input[name="items.0.quantity"]').fill('1');
        await page.locator('input[name="items.0.unitPrice"]').fill('100');

        await page.getByRole('button', { name: 'Save Quote' }).click();

        // 2. Go back to Customers and try to delete
        await page.goto('/customers');

        // Handle Delete Dialog (window.confirm)
        page.on('dialog', dialog => dialog.accept());

        // Click Delete button (second button in actions cell, or last button)
        await page.getByRole('row', { name: 'Acme Inc' }).getByRole('cell').last().getByRole('button').last().click();

        // Expect Error - Verify customer still exists
        // Since the UI catches error and logs it, the row remains.
        await expect(page.getByText('Acme Inc')).toBeVisible();

        // DELETE (Success case)
        // 1. Create a fresh customer
        await page.getByRole('button', { name: 'Add Customer' }).click();
        await page.getByPlaceholder('Name').fill('Temp Customer');
        await page.getByRole('button', { name: 'Create' }).click();

        // 2. Delete it
        await page.getByRole('row', { name: 'Temp Customer' }).getByRole('cell').last().getByRole('button').last().click();

        // Verify Removal
        await expect(page.getByText('Temp Customer')).not.toBeVisible();
    });

});
