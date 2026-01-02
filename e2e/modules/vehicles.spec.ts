import { test, expect } from '@playwright/test';

test.describe('Vehicles Module', () => {

    test('Vehicle Lifecycle and Profitability Check', async ({ page }) => {
        // 1. CREATE
        await page.goto('/vehicles');
        await page.getByRole('button', { name: 'Add Vehicle' }).click();

        // Vehicle Identification is open by default
        await page.getByPlaceholder('e.g., DXB A-12345').fill('ABC-123-TEST');
        await page.getByPlaceholder('e.g., Toyota').fill('Toyota');
        await page.getByPlaceholder('e.g., Camry').fill('Camry');

        // Fill Financial (Need to expand)
        await page.getByText('💰 Financial Tracking').click();
        await page.getByLabel('Purchase Price (AED)').fill('20000');
        await page.getByLabel('Base Rental Price (AED)').fill('150');

        await page.getByRole('button', { name: 'Create Vehicle' }).click();

        // Handle potential Expense Creation Prompt
        page.on('dialog', dialog => dialog.accept());

        // Verify
        await expect(page.getByText('ABC-123-TEST')).toBeVisible();

        // 2. DUPLICATE CHECK
        await page.getByRole('button', { name: 'Add Vehicle' }).click();
        await page.getByPlaceholder('e.g., DXB A-12345').fill('ABC-123-TEST');
        await page.getByRole('button', { name: 'Create Vehicle' }).click();

        // Expect Error Message
        await expect(page.getByText('UNIQUE constraint failed').or(page.getByText('already exists'))).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();

        // 3. PROFITABILITY VIEW
        // Go to details/profitability
        // Row actions: Profitability (Link), Edit (Button), Delete (Button) (Order depends on code, but link is unique in actions typically)
        // Link has title "View Profitability"
        await page.getByRole('row', { name: 'ABC-123-TEST' }).getByRole('cell').last().locator('a').first().click();

        await expect(page).toHaveURL(/.*vehicle-finances/);
        // Check for charts/widgets
        await expect(page.getByText('Total Revenue')).toBeVisible();
        await expect(page.getByText('Net Profit')).toBeVisible();

        // 4. DELETE
        await page.goto('/vehicles');

        // Delete
        // Target actions cell, then last button (Delete)
        const row = page.getByRole('row', { name: 'ABC-123-TEST' });
        await row.getByRole('cell').last().getByRole('button').last().click();

        // Verify Removal
        await expect(page.getByText('ABC-123-TEST')).not.toBeVisible();
    });

});
