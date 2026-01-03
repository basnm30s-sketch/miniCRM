import { test, expect } from '@playwright/test';

test.describe('Admin Settings', () => {
    test('Settings Update', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const newCompanyName = `E2E Test Corp ${uniqueId}`;

        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        // 1. Update Company Info
        const companyNameInput = page.getByLabel('Company Name');
        await expect(companyNameInput).toBeVisible({ timeout: 5000 });
        await companyNameInput.fill(newCompanyName);

        const addressInput = page.getByLabel('Address');
        if (await addressInput.isVisible({ timeout: 500 }).catch(() => false)) {
            await addressInput.fill('123 Test St');
        }

        await page.getByRole('button', { name: 'Save Settings' }).click();

        // Wait for network to settle after save
        await page.waitForLoadState('networkidle');

        // Verify Success (toast) - FIXED: Proper assertion instead of timeout
        const successToast = page.getByText('Settings saved successfully').first();
        await expect(successToast).toBeVisible({ timeout: 5000 });

        // Optionally wait for toast to disappear before reloading
        await expect(successToast).not.toBeVisible({ timeout: 5000 }).catch(() => {
            // Toast might stay visible or auto-dismiss, either is fine
        });

        // Reload and Verify Persisted - FIXED: Removed hardcoded timeout
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Wait for the input to be visible and have the correct value
        const reloadedInput = page.getByLabel('Company Name');
        await expect(reloadedInput).toBeVisible({ timeout: 5000 });
        await expect(reloadedInput).toHaveValue(newCompanyName, { timeout: 5000 });
    });
});