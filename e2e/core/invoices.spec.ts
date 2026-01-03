import { test, expect } from '@playwright/test';

test.describe('Invoices Module', () => {
    test('Direct Invoice Creation', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const customerName = `Invoice Test ${uniqueId}`;

        // Setup Dialog Handler
        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // 1. Setup Customer
        await page.goto('/customers');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Add Customer' }).click();
        await page.getByPlaceholder('Name').fill(customerName);
        await page.getByRole('button', { name: 'Create' }).click();
        await page.waitForLoadState('networkidle');

        // Verify Customer Exists
        await expect(page.getByText(customerName)).toBeVisible();

        // 2. Create Invoice
        await page.goto('/invoices');
        await page.waitForLoadState('networkidle');
        await page.getByRole('link', { name: 'New Invoice' }).or(page.getByRole('button', { name: 'New Invoice' })).first().click();
        await page.waitForLoadState('networkidle');

        // Select Customer (Radix UI Combobox) -> FIXED
        // Wait for the customer dropdown to be ready
        const customerCombobox = page.getByRole('combobox', { name: /customer/i }).or(page.locator('[aria-label*="Customer"]')).or(page.locator('[placeholder*="customer"]')).first();
        await expect(customerCombobox).toBeVisible({ timeout: 5000 });

        // Click to open the dropdown
        await customerCombobox.click();

        // Type to search for the customer
        await page.keyboard.type(customerName);

        // Wait for and click the matching option
        const customerOption = page.getByRole('option', { name: new RegExp(customerName, 'i') });
        await expect(customerOption).toBeVisible({ timeout: 5000 });
        await customerOption.click();

        // Add Items
        await page.getByRole('button', { name: 'Add Item' }).click();
        const descriptionInput = page.locator('input[name="items.0.description"]');
        await expect(descriptionInput).toBeVisible();
        await descriptionInput.fill('Widget X');
        await page.locator('input[name="items.0.quantity"]').fill('3');
        await page.locator('input[name="items.0.unitPrice"]').fill('10');

        // Save
        await page.getByRole('button', { name: 'Save Invoice' }).click();
        await page.waitForLoadState('networkidle');

        // Verify success toast or navigation
        await expect(page.getByText(/invoice.*saved|created/i).or(page.getByRole('row', { name: new RegExp(customerName, 'i') }))).toBeVisible({ timeout: 5000 });

        // 3. Verify in List
        await page.goto('/invoices');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('row', { name: new RegExp(customerName, 'i') })).toBeVisible({ timeout: 5000 });

        // 4. Delete
        const row = page.getByRole('row', { name: new RegExp(customerName, 'i') });
        await row.getByRole('cell').last().getByRole('button').last().click();

        // Verify deletion with assertion instead of timeout
        await expect(page.getByRole('row', { name: new RegExp(customerName, 'i') })).not.toBeVisible({ timeout: 5000 });

        // Cleanup Customer
        await page.goto('/customers');
        await page.waitForLoadState('networkidle');
        const custRow = page.getByRole('row', { name: new RegExp(customerName, 'i') });
        if (await custRow.isVisible().catch(() => false)) {
            await custRow.getByRole('cell').last().getByRole('button').last().click();
            await expect(custRow).not.toBeVisible({ timeout: 5000 });
        }
    });
});