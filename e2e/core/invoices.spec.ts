import { test, expect } from '@playwright/test';

test.describe('Invoices Module', () => {
    test('Direct Invoice Creation', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const customerName = `Invoice Test ${uniqueId}`;

        // Setup Dialog Handler to accept deletions
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
        // Click New Invoice button
        await page.getByRole('link', { name: 'New Invoice' }).or(page.getByRole('button', { name: 'New Invoice' })).first().click();
        await page.waitForLoadState('networkidle');

        // Select Customer
        const customerCombobox = page.getByRole('combobox', { name: /customer/i }).or(page.locator('[aria-label*="Customer"]')).or(page.locator('button:has-text("Select a customer")')).first();
        await expect(customerCombobox).toBeVisible({ timeout: 5000 });
        await customerCombobox.click();
        await page.keyboard.type(customerName);
        const customerOption = page.getByRole('option', { name: new RegExp(customerName, 'i') });
        await expect(customerOption).toBeVisible({ timeout: 5000 });
        await customerOption.click();

        // Add Items
        await page.getByRole('button', { name: 'Add Line Item' }).click();

        // Target inputs in the first row of the table
        // Description is 3rd column (index 2) but depending on hidden columns it varies. 
        // Based on visible columns in InvoiceForm: #, Vehicle, Description... matches.
        // Let's use robust selector if possible.
        // We can find the row by looking for the trash icon and going up?
        // Or just assume first row.
        const firstRow = page.locator('table tbody tr').first();

        // Find input for description (usually text type, no name). 
        // Iterate or guess index. 
        // Column 3 is description.
        const descriptionInput = firstRow.locator('td').nth(2).locator('input');
        await descriptionInput.fill('Widget X');

        // Quantity (Column 5)
        const quantityInput = firstRow.locator('td').nth(4).locator('input');
        await quantityInput.fill('3');

        // Unit Price (Column 6)
        const priceInput = firstRow.locator('td').nth(5).locator('input');
        await priceInput.fill('10');

        // Save
        await page.getByRole('button', { name: 'Save Invoice' }).first().click();
        await page.waitForLoadState('networkidle');

        // Verify success toast or redirection
        await expect(page.getByText(/invoice.*saved|created/i).or(page.getByText(/invoice.*updated/i))).toBeVisible({ timeout: 5000 });

        // 3. Verify in List
        await page.goto('/invoices'); // Reload to be sure or check valid navigation
        await page.waitForLoadState('networkidle');

        // List item is a div with the customer name
        // We key off customer name being present in the list pane (left side)
        const listItem = page.locator('div.border-l-\\[3px\\]', { hasText: customerName }).first();
        await expect(listItem).toBeVisible({ timeout: 5000 });

        // 4. Delete
        // Click the list item to select it again if needed (it should be selected)
        await listItem.click();

        // Click Delete button in the detail pane (right side)
        // It consumes a dialog
        await page.getByRole('button', { name: 'Delete' }).click();

        // Verify deletion


        // Dialog is handled automatically

        // Verify deletion
        await expect(listItem).not.toBeVisible({ timeout: 5000 });

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