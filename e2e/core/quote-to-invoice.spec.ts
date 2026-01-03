import { test, expect } from '@playwright/test';

test.describe('Quote to Invoice Lifecycle', () => {

    test('Should create a quote and convert it to an invoice', async ({ page }) => {
        // 1. Create Customer
        await page.goto('/customers');
        await page.getByRole('button', { name: 'Add Customer' }).click();
        await page.getByLabel('Name').fill('John Doe Flow');
        await page.getByLabel('Email').fill('john.flow@example.com');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('John Doe Flow')).toBeVisible();

        // 2. Create Quote
        await page.goto('/quotations');
        await page.getByRole('button', { name: 'New Quotation' }).click();

        // Select Customer (Assuming autocomplete or select)
        await page.getByRole('combobox').click();
        await page.getByLabel('John Doe Flow').click(); // Select by text if possible, or type

        // Add Line Item 1
        await page.getByRole('button', { name: 'Add Item' }).click();
        await page.locator('input[name="items.0.description"]').fill('Service A');
        await page.locator('input[name="items.0.quantity"]').fill('1');
        await page.locator('input[name="items.0.unitPrice"]').fill('100');

        // Add Line Item 2
        await page.getByRole('button', { name: 'Add Item' }).click();
        await page.locator('input[name="items.1.description"]').fill('Service B');
        await page.locator('input[name="items.1.quantity"]').fill('2');
        await page.locator('input[name="items.1.unitPrice"]').fill('200');

        // Save Quote
        await page.getByRole('button', { name: 'Save Quote' }).click();

        // Verify Quote Created
        await expect(page).toHaveURL(/.*quotations/); // Should redirect to list or details
        // If redirected to list, click the new quote
        if (!page.url().includes('/quotes/')) {
            await page.getByText('John Doe Flow').first().click();
        }

        // Verify Total ($100 + $400 = $500)
        await expect(page.getByText('$500.00')).toBeVisible(); // Assuming formatting

        // 3. Convert to Invoice
        await page.getByRole('button', { name: 'Convert to Invoice' }).click();

        // Verify Redirect to Invoice Edit/Create page
        await expect(page).toHaveURL(/.*invoices/);
        await expect(page.getByRole('heading', { name: 'Edit Invoice' }).or(page.getByRole('heading', { name: 'New Invoice' }))).toBeVisible();

        // Verify Data carried over
        await expect(page.locator('input[name="items.0.description"]')).toHaveValue('Service A');
        await expect(page.getByText('$500.00')).toBeVisible();

        // Save Invoice
        await page.getByRole('button', { name: 'Save Invoice' }).click();

        // 4. Mark as Paid
        // Assuming we are on Invoice Details or List
        if (!page.url().includes('/invoices/')) {
            await page.getByText('John Doe Flow').first().click();
        }

        // Change Status
        // Depending on UI implementation (Select or Button)
        // trying common pattern:
        const statusTrigger = page.locator('[data-testid="status-trigger"]');
        if (await statusTrigger.isVisible()) {
            await statusTrigger.click();
            await page.getByRole('option', { name: 'Paid' }).click();
        } else {
            // Fallback: Edit mode
            await page.getByRole('button', { name: 'Edit' }).click();
            await page.getByRole('combobox', { name: 'Status' }).click();
            await page.getByLabel('Paid').click();
            await page.getByRole('button', { name: 'Save' }).click();
        }

        // Verify Status Indicator
        await expect(page.getByText('Paid', { exact: true })).toBeVisible();
    });

});
