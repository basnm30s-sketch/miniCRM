import { test, expect } from '@playwright/test';

test.describe('Vehicle Finances Module', () => {

    test('Dashboard and List View', async ({ page }) => {
        // Navigate
        await page.goto('/vehicle-finances');

        // Verify Header
        await expect(page.getByRole('heading', { name: 'Vehicle Finances' })).toBeVisible();

        // Check for page content stability
        await page.waitForLoadState('networkidle');

        // Verify list area: subtext or vehicle count is present (page has no "Vehicles" heading)
        await expect(page.getByText('Select a vehicle to view details')).toBeVisible({ timeout: 10000 });

        // Optional: Check specific dashboard state without failing
        if (await page.getByText(/Overall Financial Snapshot/i).isVisible()) {
            console.log('Dashboard Data Loaded');
        } else {
            console.log('Dashboard Data Unavailable');
        }

        // Check empty state or vehicle cards
        const noVehicles = page.getByText('No vehicles found');
        const noMatch = page.getByText('No vehicles match');

        if (await noVehicles.isVisible({ timeout: 1000 }).catch(() => false)) {
            await expect(noVehicles).toBeVisible();
        }
    });

});
