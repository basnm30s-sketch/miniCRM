import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api';

/**
 * Quotes E2E Test - Rewritten from scratch
 * 
 * Key learnings from manual exploration:
 * - Vehicles in dev DB have vehicleNumber populated (e.g., "23 A 45345", "V-1767345227620")
 * - The quote creation page uses Radix UI Select components
 * - Vehicle dropdown displays vehicleNumber field
 * - Test DB needs proper seeding before tests run
 */

test.describe('Quotations Module', () => {
    let api: ApiHelper;
    let customerId: string | number;
    let customerName: string;

    test.beforeEach(async ({ request }) => {
        api = new ApiHelper(request);
        const uniqueId = Date.now().toString();

        // Seed Customer
        customerName = `Quote Test ${uniqueId}`;
        customerId = await api.createCustomer(customerName);
        console.log(`Seeded Customer: ${customerName} (ID: ${customerId})`);
    });

    test.afterEach(async () => {
        // Cleanup - ignore errors if already deleted
        try {
            if (customerId) await api.deleteCustomer(customerId);
        } catch (e) {
            console.log('Cleanup: Customer already deleted or error');
        }
    });

    test('Quote Creation and Lifecycle', async ({ page }) => {
        test.slow();

        // Setup Dialog Handler
        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // 1. Navigate directly to quote creation page
        await page.goto('/quotes/create');
        await page.waitForLoadState('networkidle');
        console.log('Navigated to Quote Create Page');

        // 2. Select Customer
        const customerCombobox = page.getByRole('combobox').first();
        await expect(customerCombobox).toBeVisible();
        await customerCombobox.click();
        await page.waitForTimeout(300); // Portal animation

        await page.keyboard.type(customerName);
        const customerOption = page.getByRole('option', { name: customerName }).first();
        await expect(customerOption).toBeVisible({ timeout: 10000 });
        await customerOption.click();
        console.log('Customer Selected');

        // 3. Add Line Item
        await page.getByRole('button', { name: 'Add Line Item' }).click();
        console.log('Added Line Item');

        // 4. Select Vehicle (use first available - dev DB has vehicles)
        const vehicleCombobox = page.getByRole('combobox').nth(1);
        await expect(vehicleCombobox).toBeVisible();
        await vehicleCombobox.click();
        await page.waitForTimeout(500);

        // Get first available vehicle
        const allOptions = page.getByRole('option');
        const optionCount = await allOptions.count();
        console.log(`Found ${optionCount} vehicle options`);

        if (optionCount === 0) {
            throw new Error('No vehicles found - database not seeded');
        }

        // Log first few options for debugging
        for (let i = 0; i < Math.min(optionCount, 3); i++) {
            const text = await allOptions.nth(i).textContent();
            console.log(`  Vehicle option ${i}: "${text}"`);
        }

        await allOptions.first().click();
        console.log('Vehicle Selected');

        // 5. Fill Line Item Details
        const row = page.locator('tbody tr').first();
        await row.locator('input[type="number"]').nth(0).fill('2');  // Quantity
        await row.locator('input[type="number"]').nth(1).fill('150'); // Price
        console.log('Filled Line Item Details');

        // 6. Remove Empty Rows if any
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        if (rowCount > 1) {
            for (let i = rowCount - 1; i > 0; i--) {
                const deleteBtn = rows.nth(i).getByRole('button').first();
                if (await deleteBtn.isVisible()) {
                    await deleteBtn.click();
                }
            }
            await expect(rows).toHaveCount(1);
            console.log('Removed Empty Rows');
        }

        // 7. Submit Quote
        const createBtn = page.getByRole('button', { name: /Create Quote|Update Quote/ });
        await expect(createBtn).toBeVisible();
        await expect(createBtn).toBeEnabled();

        console.log('Submitting Quote...');
        await createBtn.click();

        // 8. Wait for redirect to quotations list
        await page.waitForURL(/.*quotations/, { timeout: 10000 });
        console.log('Redirected to Quotations List');

        // 9. Verify quote appears in list
        await page.reload();
        await page.waitForLoadState('networkidle');
        const quoteRow = page.getByRole('row', { name: new RegExp(customerName, 'i') });
        await expect(quoteRow).toBeVisible();
        console.log('Quote Visible in List');

        // 10. Delete Quote
        const deleteButton = quoteRow.getByRole('cell').last().getByRole('button').last();
        await deleteButton.click();

        const confirmDeleteBtn = page.getByRole('button', { name: 'Delete' });
        await expect(confirmDeleteBtn).toBeVisible();
        await confirmDeleteBtn.click();

        await expect(quoteRow).not.toBeVisible();
        console.log('Quote Deleted Successfully');
    });
});
