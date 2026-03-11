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

        // Click Add Vehicle button (form is a custom modal without role="dialog")
        await page.getByRole('button', { name: 'Add Vehicle' }).click();
        await expect(page.getByPlaceholder('e.g., DXB A-12345')).toBeVisible({ timeout: 5000 });

        // Vehicle Identification
        await page.getByPlaceholder('e.g., DXB A-12345').fill(vehicleId);
        await page.getByPlaceholder('e.g., Sedan, SUV, Lorry').fill('Sedan'); // Required for strict DB constraint
        await page.getByPlaceholder('e.g., Toyota').fill('Toyota');

        await page.getByRole('button', { name: 'Create Vehicle' }).click();

        // Wait for add form to close (placeholder disappears)
        await expect(page.getByPlaceholder('e.g., DXB A-12345')).not.toBeVisible({ timeout: 10000 });
        await page.waitForLoadState('networkidle');

        // Verify row exists after reload
        await page.reload();
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('row', { name: new RegExp(vehicleId, 'i') })).toBeVisible({ timeout: 10000 });

        // 2. DELETE
        const row = page.getByRole('row', { name: new RegExp(vehicleId, 'i') });

        // Click delete button
        await row.getByRole('cell').last().getByRole('button').last().click();

        // FIXED: Verify Removal with assertion instead of timeout
        await expect(page.getByRole('row', { name: new RegExp(vehicleId, 'i') })).not.toBeVisible({ timeout: 5000 });
    });
});