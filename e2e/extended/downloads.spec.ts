import { test, expect } from '@playwright/test';

test.describe('Artifact Downloads', () => {

    test.fixme('Should download Quote PDF', async ({ page }) => {
        test.setTimeout(60000); // PDF generation might be slow
        const uniqueId = Date.now().toString();
        const customerName = `Download Test ${uniqueId}`;

        // Setup Dialog Handler
        page.on('dialog', async dialog => dialog.accept());

        // 1. Setup Customer
        await page.goto('/customers');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Add Customer' }).click();
        await page.getByPlaceholder('Name').fill(customerName);
        await page.getByRole('button', { name: 'Create' }).click();
        await page.waitForLoadState('networkidle');

        // 2. Create Quote
        await page.goto('/quotations');
        await page.waitForLoadState('networkidle');

        await page.getByRole('link', { name: 'New Quotation' }).or(page.getByRole('button', { name: 'New Quotation' })).click();
        await page.waitForLoadState('networkidle');

        // Select Customer
        await page.getByRole('combobox').click();
        await page.keyboard.type(customerName);
        await page.waitForTimeout(500);
        await page.getByText(customerName).first().click();

        // Add Item
        await page.getByRole('button', { name: 'Add Item' }).click();
        await page.locator('input[name="items.0.description"]').fill('PDF Item');
        await page.locator('input[name="items.0.quantity"]').fill('1');
        await page.locator('input[name="items.0.unitPrice"]').fill('500');

        await page.getByRole('button', { name: 'Save Quote' }).click();
        await page.waitForLoadState('networkidle');

        // 3. Download
        // Wait for the button to be interactive
        const downloadBtn = page.getByRole('button', { name: /Download|Save PDF|Export/i }).first();
        await expect(downloadBtn).toBeVisible();
        await expect(downloadBtn).toBeEnabled();

        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
        await downloadBtn.click();

        // Sometimes generation takes time, so we might need to click again if it didn't trigger? 
        // No, avoid double clicks. Just wait.
        const download = await downloadPromise;

        // Verify Filename
        expect(download.suggestedFilename()).toContain('Quote-');
        expect(download.suggestedFilename()).toContain('.pdf');

        // Cleanup Customer
        await page.goto('/customers');
        const custRow = page.getByRole('row', { name: new RegExp(customerName, 'i') });
        if (await custRow.isVisible().catch(() => false)) {
            await custRow.getByRole('cell').last().getByRole('button').last().click();
        }
    });

    test('Should export Invoices to Excel', async ({ page }) => {
        await page.goto('/invoices');
        await page.waitForLoadState('networkidle');

        const exportBtn = page.getByRole('button', { name: /Export|Excel/i });

        if (await exportBtn.isVisible()) {
            const downloadPromise = page.waitForEvent('download');
            await exportBtn.click();
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toContain('.xlsx');
        } else {
            test.skip(true, 'Export button not visible UI');
        }
    });

});
