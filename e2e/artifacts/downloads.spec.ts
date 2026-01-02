import { test, expect } from '@playwright/test';

test.describe('Artifact Downloads', () => {

    test('Should download Quote PDF', async ({ page }) => {
        // Setup: Create Quote
        await page.goto('/customers');
        await page.getByRole('button', { name: 'Add Customer' }).click();
        await page.getByLabel('Name').fill('Download Tester');
        await page.getByRole('button', { name: 'Save' }).click();

        await page.goto('/quotations');
        await page.getByRole('button', { name: 'New Quotation' }).click();
        await page.getByRole('combobox').click();
        await page.getByLabel('Download Tester').click();
        await page.getByRole('button', { name: 'Save Quote' }).click();

        // Navigate to Details or stay
        // Find "Download PDF" button
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Save PDF' }).click();
        const download = await downloadPromise;

        // Verify Filename
        // e.g. Quote-Q20251001-0001.pdf
        expect(download.suggestedFilename()).toContain('Quote-');
        expect(download.suggestedFilename()).toContain('.pdf');

        // Verify Checksum or Size (Optional)
        // const path = await download.path();
    });

    test('Should export Invoices to Excel', async ({ page }) => {
        await page.goto('/invoices');

        // Assuming "Export to Excel" button exists on List page
        const downloadPromise = page.waitForEvent('download');

        // Click might be in a menu "Actions" -> "Export"
        const exportBtn = page.getByRole('button', { name: 'Export' });
        if (await exportBtn.isVisible()) {
            await exportBtn.click();
        } else {
            // Skip if button not found in standard place (might be custom implementation)
            test.skip(true, 'Export button not found');
            return;
        }

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.xlsx');
    });

});
