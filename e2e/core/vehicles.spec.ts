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

        // Click Add Vehicle button
        await page.getByRole('button', { name: 'Add Vehicle' }).click();

        // FIXED: Get modal reference to track its state
        const modal = page.getByRole('dialog').or(page.locator('[role="dialog"]')).or(page.locator('.modal, [data-modal]')).first();
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Vehicle Identification
        await page.getByPlaceholder('e.g., DXB A-12345').fill(vehicleId);
        await page.getByPlaceholder('e.g., Sedan, SUV, Lorry').fill('Sedan'); // Required for strict DB constraint
        await page.getByPlaceholder('e.g., Toyota').fill('Toyota');

        await page.getByRole('button', { name: 'Create Vehicle' }).click();

        // FIXED: Wait for modal to close before checking table
        await expect(modal).not.toBeVisible({ timeout: 5000 });

        // Wait for network to settle after creation
        await page.waitForLoadState('networkidle');

        // Verify row exists - FIXED: Wait for the element with proper timeout
        await page.reload();
        await page.waitForLoadState('networkidle');
        console.log('Table Text:', await page.locator('tbody').textContent());
        await expect(page.getByText(vehicleId)).toBeVisible({ timeout: 10000 });

        // 2. DELETE
        const row = page.getByRole('row', { name: new RegExp(vehicleId, 'i') });
        await expect(row).toBeVisible({ timeout: 5000 });

        // Click delete button
        await row.getByRole('cell').last().getByRole('button').last().click();

        // FIXED: Verify Removal with assertion instead of timeout
        await expect(page.getByRole('row', { name: new RegExp(vehicleId, 'i') })).not.toBeVisible({ timeout: 5000 });
    });
});