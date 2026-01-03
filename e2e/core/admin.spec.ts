import { test, expect } from '@playwright/test';

test.describe('Admin Settings', () => {

    test('Settings Update', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const newCompanyName = `E2E Test Corp ${uniqueId}`;

        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        // 1. Update Company Info
        const companyNameInput = page.getByLabel('Company Name');
        await companyNameInput.fill(newCompanyName);

        const addressInput = page.getByLabel('Address');
        if (await addressInput.isVisible({ timeout: 500 }).catch(() => false)) {
            await addressInput.fill('123 Test St');
        }

        await page.getByRole('button', { name: 'Save Settings' }).click();
        await page.waitForLoadState('networkidle');

        // Verify Success (toast)
        await expect(page.getByText('Settings saved successfully').first()).toBeVisible({ timeout: 5000 });

        await page.waitForTimeout(5000); // Wait 5s for persistance

        // Reload and Verify Persisted
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // UI hydration wait
        await expect(page.getByLabel('Company Name')).toHaveValue(newCompanyName);
    });

});
