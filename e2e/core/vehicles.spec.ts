import { test, expect } from '@playwright/test';

test.describe('Vehicles Module', () => {

    test('Vehicle Lifecycle', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const vehicleId = `V-${uniqueId.slice(-6)}`;

        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // 1. CREATE
        await page.goto('/vehicles');
        await page.waitForLoadState('networkidle');

        // Page heading is "Fleet Management"
        await expect(page.getByRole('heading', { name: /Fleet Management/i })).toBeVisible({ timeout: 5000 });

        await page.getByRole('button', { name: 'Add Vehicle' }).click();

        // Vehicle Identification
        await page.getByPlaceholder('e.g., DXB A-12345').fill(vehicleId);
        await page.getByPlaceholder('e.g., Toyota').fill('Toyota');

        await page.getByRole('button', { name: 'Create Vehicle' }).click();

        await page.waitForLoadState('networkidle');

        // Verify row exists
        await expect(page.getByRole('row', { name: new RegExp(vehicleId, 'i') })).toBeVisible({ timeout: 5000 });

        // 2. DELETE
        const row = page.getByRole('row', { name: new RegExp(vehicleId, 'i') });
        await row.getByRole('cell').last().getByRole('button').last().click();

        // Verify Removal
        await page.waitForTimeout(500);
        await expect(page.getByRole('row', { name: new RegExp(vehicleId, 'i') })).not.toBeVisible();
    });

});
