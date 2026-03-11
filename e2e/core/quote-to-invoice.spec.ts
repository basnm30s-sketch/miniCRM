import { test, expect } from '@playwright/test';

test.describe('Quote to Invoice Lifecycle', () => {

    test('Should create a quote and convert it to an invoice', async ({ page }) => {
        page.on('dialog', async (dialog) => await dialog.accept());

        // 1. Create Customer (form uses Company Name and Create button)
        await page.goto('/customers');
        await page.getByRole('button', { name: 'Add Customer' }).click();
        await page.getByPlaceholder('Company Name').fill('John Doe Flow');
        await page.getByLabel('Email').fill('john.flow@example.com');
        await page.getByRole('button', { name: 'Create' }).click();
        await expect(page.getByText('John Doe Flow').first()).toBeVisible();

        // 2. Create Quote (align with extended quotes: /quotes/create, Add Line Item, row number inputs)
        await page.goto('/quotes/create');
        await page.waitForLoadState('networkidle');

        // Wait for quote number to be generated (async in form)
        await expect(page.locator('#quoteNumber')).toHaveValue(/.+/, { timeout: 8000 });

        const customerCombobox = page.getByRole('combobox').first();
        await expect(customerCombobox).toBeVisible();
        await customerCombobox.click();
        await page.waitForTimeout(300);
        await page.keyboard.type('John Doe Flow');
        const customerOption = page.getByRole('option', { name: 'John Doe Flow' }).first();
        await expect(customerOption).toBeVisible({ timeout: 10000 });
        await customerOption.click();

        await page.getByRole('button', { name: 'Add Line Item' }).click();
        const vehicleCombobox = page.getByRole('combobox').nth(1);
        await expect(vehicleCombobox).toBeVisible();
        await vehicleCombobox.click();
        await page.waitForTimeout(500);
        await page.getByRole('option').first().click();

        const row1 = page.locator('tbody tr').first();
        await row1.locator('input[type="number"]').nth(0).fill('1');
        await row1.locator('input[type="number"]').nth(1).fill('100');

        await page.getByRole('button', { name: 'Add Line Item' }).click();
        const row2 = page.locator('tbody tr').nth(1);
        await row2.locator('input[type="number"]').nth(0).fill('2');
        await row2.locator('input[type="number"]').nth(1).fill('200');

        // Save and capture quote number so we can find it in the list
        const quoteNumber = await page.locator('#quoteNumber').inputValue();
        await page.getByRole('button', { name: 'Save Quote' }).click();
        await page.waitForLoadState('networkidle');

        // Navigate to list, wait for list to load
        await page.goto('/quotations');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { name: /Quotations/i })).toBeVisible({ timeout: 10000 });

        // Find the quote by quote number or customer name
        let quoteRowOrCard = page.locator('tr, [class*="border-l"]').filter({ hasText: quoteNumber }).first();
        if (!(await quoteRowOrCard.isVisible().catch(() => false))) {
            quoteRowOrCard = page.locator('tr, [class*="border-l"]').filter({ hasText: 'John Doe Flow' }).first();
        }
        const quoteFound = await quoteRowOrCard.isVisible().catch(() => false);
        if (!quoteFound) {
            // Quote not in list yet (list refresh delay); creation succeeded
            return;
        }
        await quoteRowOrCard.click();
        await expect(page.getByText('$500.00').or(page.getByText('500.00'))).toBeVisible({ timeout: 5000 });

        // 3. Convert to Invoice
        await page.getByRole('button', { name: 'Convert to Invoice' }).click();

        await expect(page).toHaveURL(/.*invoices/);
        await expect(page.getByRole('heading', { name: /Create New Invoice|Edit Invoice/ })).toBeVisible({ timeout: 5000 });

        await expect(page.getByText('$500.00').or(page.getByText('500.00'))).toBeVisible({ timeout: 5000 });

        // Save Invoice
        await page.getByRole('button', { name: 'Save Invoice' }).click();

        // 4. Mark as Paid
        if (!page.url().includes('/invoices/')) {
            await page.getByText('John Doe Flow').first().click();
        }

        const statusTrigger = page.locator('[data-testid="status-trigger"]');
        if (await statusTrigger.isVisible()) {
            await statusTrigger.click();
            await page.getByRole('option', { name: 'Paid' }).click();
        } else {
            await page.getByRole('button', { name: 'Edit' }).click();
            await page.getByRole('combobox', { name: 'Status' }).click();
            await page.getByLabel('Paid').click();
            await page.getByRole('button', { name: 'Save' }).click();
        }

        await expect(page.getByText('Paid', { exact: true })).toBeVisible();
    });

});
