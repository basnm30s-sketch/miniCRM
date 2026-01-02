import { test, expect } from '@playwright/test';

test.describe('Quotes Module', () => {

    test('Quote Creation and Status', async ({ page }) => {
        // 1. Setup Customer
        await page.goto('/customers');
        await page.getByRole('button', { name: 'Add Customer' }).click();
        await page.getByLabel('Name').fill('Quote Tester');
        await page.getByRole('button', { name: 'Save' }).click();

        // 2. Create Quote
        await page.goto('/quotations');
        await page.getByRole('button', { name: 'New Quotation' }).click();

        // Select Customer
        await page.getByRole('combobox').click();
        await page.getByLabel('Quote Tester').click();

        // Add Items
        await page.getByRole('button', { name: 'Add Item' }).click();
        await page.locator('input[name="items.0.description"]').fill('Rental');
        await page.locator('input[name="items.0.quantity"]').fill('5');
        await page.locator('input[name="items.0.unitPrice"]').fill('100');

        // Save
        await page.getByRole('button', { name: 'Save Quote' }).click();

        // Verify Draft Status
        await expect(page.getByText('DRAFT')).toBeVisible(); // Assuming badge

        // 3. Edit Status (if applicable manually) or just Edit content
        await page.getByRole('button', { name: 'Edit' }).click();
        await page.locator('input[name="items.0.quantity"]').fill('6');
        await page.getByRole('button', { name: 'Save' }).click();

        // Verify Total updated (600)
        await expect(page.getByText('600.00')).toBeVisible();

        // 4. Preview PDF (Mock check)
        // If there is a Preview button
        const previewBtn = page.getByRole('button', { name: 'Preview PDF' });
        if (await previewBtn.isVisible()) {
            await previewBtn.click();
            await expect(page.locator('div[role="dialog"]')).toBeVisible(); // Modal
            await page.keyboard.press('Escape'); // Close
        }

        // 5. Delete
        await page.goto('/quotations');
        await page.getByRole('row', { name: 'Quote Tester' }).getByRole('button', { name: 'Delete' }).click();
        await page.getByRole('button', { name: 'Confirm' }).click();
    });

});
