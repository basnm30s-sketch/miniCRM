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

        // Select Customer (Native Select)
        await page.waitForLoadState('networkidle');
        await page.reload(); // Force data refresh
        await page.waitForLoadState('networkidle');

        console.log('Select HTML:', await page.locator('#customer').innerHTML());

        await page.locator('#customer').selectOption({ label: customerName });

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

        // 3. Verify in List
        await page.reload();
        await expect(page.getByRole('row', { name: new RegExp(customerName, 'i') })).toBeVisible({ timeout: 5000 });

        // 4. Delete
        const row = page.getByRole('row', { name: new RegExp(customerName, 'i') });
        await row.getByRole('cell').last().getByRole('button').last().click();

        await page.waitForTimeout(500);
        await expect(page.getByRole('row', { name: new RegExp(customerName, 'i') })).not.toBeVisible();

        // Cleanup Customer
        await page.goto('/customers');
        const custRow = page.getByRole('row', { name: new RegExp(customerName, 'i') });
        if (await custRow.isVisible().catch(() => false)) {
            await custRow.getByRole('cell').last().getByRole('button').last().click();
        }
    });

});
