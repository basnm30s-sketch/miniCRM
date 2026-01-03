import { test, expect } from '@playwright/test';

test.describe('Vendors Module', () => {

    test('Vendor Management', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const vendorName = `Vendor ${uniqueId}`;

        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // CREATE
        await page.goto('/vendors');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Add Vendor' }).click();

        await page.getByPlaceholder('Name').fill(vendorName);
        await page.getByPlaceholder('Contact Person').fill('Mike');
        await page.getByPlaceholder('Email').fill(`mike${uniqueId}@vendor.com`);
        await page.getByPlaceholder('Phone').fill('555-0123');

        await page.getByRole('button', { name: 'Create' }).click();
        await page.waitForLoadState('networkidle');

        // Verify
        await expect(page.getByRole('row', { name: new RegExp(vendorName, 'i') })).toBeVisible({ timeout: 5000 });

        // EDIT
        await page.getByRole('row', { name: new RegExp(vendorName, 'i') }).getByRole('cell').last().getByRole('button').first().click();
        await page.waitForLoadState('networkidle');

        await page.getByPlaceholder('Contact Person').fill('Michael');
        await page.getByRole('button', { name: 'Update' }).click();
        await page.waitForLoadState('networkidle');

        // Verify Update
        await expect(page.getByText('Michael')).toBeVisible();

        // DELETE
        await page.getByRole('row', { name: new RegExp(vendorName, 'i') }).getByRole('cell').last().getByRole('button').last().click();

        // Verify Removal
        await page.waitForTimeout(500);
        await expect(page.getByRole('row', { name: new RegExp(vendorName, 'i') })).not.toBeVisible();
    });

});
