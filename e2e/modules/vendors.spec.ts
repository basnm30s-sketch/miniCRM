import { test, expect } from '@playwright/test';

test.describe('Vendors Module', () => {

    test('Vendor Management', async ({ page }) => {
        // Create
        await page.goto('/vendors');
        await page.getByRole('button', { name: 'Add Vendor' }).click();
        await page.getByLabel('Name').fill('AutoParts Co');
        await page.getByLabel('Contact Person').fill('Mike');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('AutoParts Co')).toBeVisible();

        // Edit
        await page.getByRole('row', { name: 'AutoParts Co' }).getByRole('button', { name: 'Edit' }).click();
        await page.getByLabel('Contact Person').fill('Michael');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Michael')).toBeVisible();

        // Delete
        await page.getByRole('row', { name: 'AutoParts Co' }).getByRole('button', { name: 'Delete' }).click();
        await page.getByRole('button', { name: 'Confirm' }).click();
        await expect(page.getByText('AutoParts Co')).not.toBeVisible();
    });

});
