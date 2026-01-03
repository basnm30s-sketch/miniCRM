import { test, expect } from '@playwright/test';

test.describe('Customers Module', () => {

    test('CRUD Operations', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const customerName = `Customer ${uniqueId}`;
        const updatedName = `Customer Updated ${uniqueId}`;

        // Setup dialog handler
        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // CREATE
        await page.goto('/customers');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Add Customer' }).click();

        await page.getByPlaceholder('Name').fill(customerName);
        await page.getByPlaceholder('Company').fill(`Corp ${uniqueId}`);
        await page.getByPlaceholder('Email').fill(`info${uniqueId}@test.com`);

        await page.getByRole('button', { name: 'Create' }).click();
        await page.waitForLoadState('networkidle');

        // Verify
        await expect(page.getByRole('row', { name: new RegExp(customerName, 'i') })).toBeVisible({ timeout: 5000 });

        // EDIT
        await page.getByRole('row', { name: new RegExp(customerName, 'i') }).getByRole('cell').last().getByRole('button').first().click();

        await page.getByPlaceholder('Name').fill(updatedName);
        await page.getByRole('button', { name: 'Update' }).click();
        await page.waitForLoadState('networkidle');

        // Verify Update
        await expect(page.getByRole('row', { name: new RegExp(updatedName, 'i') })).toBeVisible({ timeout: 5000 });

        // DELETE
        await page.getByRole('row', { name: new RegExp(updatedName, 'i') }).getByRole('cell').last().getByRole('button').last().click();

        // Verify Removal
        await page.waitForTimeout(500);
        await expect(page.getByRole('row', { name: new RegExp(updatedName, 'i') })).not.toBeVisible({ timeout: 5000 });
    });

});
