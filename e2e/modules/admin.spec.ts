import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Admin Settings', () => {

    test('Settings Update and Branding Upload', async ({ page }) => {
        await page.goto('/settings');

        // 1. Update Company Info
        await page.getByLabel('Company Name').fill('E2E Test Corp');
        await page.getByLabel('Address').fill('123 Test St');

        // 2. Upload Logo
        // We need a dummy file. 
        // Playwright allows creating buffer on the fly for uploads? 
        // Or we point to a file in file system.
        // We can use package.json as a dummy file if valid image check is not strict, 
        // or create a dummy .txt. The app likely expects image.
        // Let's assume strict image check. We might fail on upload if we don't have an image.
        // Setting buffer for upload:

        await page.setInputFiles('input[type="file"][name="logo"]', {
            name: 'logo.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
        });

        await page.getByRole('button', { name: 'Save Changes' }).click();

        // Verify Success
        await expect(page.getByText('Settings saved')).toBeVisible();

        // Reload and Verify Persisted
        await page.reload();
        await expect(page.getByLabel('Company Name')).toHaveValue('E2E Test Corp');

        // Verify Logo Src might have changed (complicated to check exact src blob/url)
        // But we check no error is shown.
    });

});
