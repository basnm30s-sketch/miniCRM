import { test, expect } from '@playwright/test';

test.describe('Payslips Module', () => {

    test.fixme('Salary Calculation and Payslip Generation', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const employeeName = `Payslip User ${uniqueId}`;
        const employeeId = `PAY-${uniqueId.slice(-4)}`;

        // Setup Dialog Handler Early
        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // 1. Setup Employee
        await page.goto('/employees');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Add Employee' }).click();
        await page.getByPlaceholder('Name').fill(employeeName);
        await page.getByPlaceholder('Employee ID').fill(employeeId);
        await page.getByLabel('Monthly').click();

        const monthlyPay = page.getByPlaceholder('Monthly Pay').or(page.getByLabel('Monthly Pay'));
        await monthlyPay.scrollIntoViewIfNeeded();
        await monthlyPay.fill('5000');

        await page.getByRole('button', { name: 'Create' }).click();
        await page.waitForLoadState('networkidle');

        // Verify creation
        await expect(page.getByRole('row', { name: new RegExp(employeeName, 'i') })).toBeVisible();

        // 2. Go to Payslips -> Generate
        await page.goto('/payslips');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.waitForLoadState('networkidle');

        await page.getByRole('link', { name: 'Generate Payslips' }).or(page.getByRole('button', { name: 'Generate Payslips' })).click();
        await page.waitForLoadState('networkidle');

        // 3. Salary Calculation Wizard
        // Step 1: Month Selection
        console.log('Wizard Step 1 Reached');
        await expect(page.getByText(/Step 1/i)).toBeVisible({ timeout: 10000 });

        const monthSelector = page.getByRole('combobox').first();
        if (await monthSelector.isVisible()) {
            await monthSelector.click();
            await page.keyboard.press('Enter');
        }

        // Check Next Button state
        const nextBtn = page.getByRole('button', { name: 'Next' });
        console.log('Next Button Disabled?', await nextBtn.isDisabled());
        await nextBtn.click();

        // Step 2: Select Employees
        console.log('Wizard Step 2 Reached');
        await expect(page.getByText(/Step 2/i)).toBeVisible({ timeout: 10000 });

        // Find row and checkbox
        const row = page.getByRole('row', { name: new RegExp(employeeName, 'i') });
        await expect(row).toBeVisible();
        await row.getByRole('checkbox').check({ force: true });

        await page.getByRole('button', { name: 'Next' }).click();

        // Step 3
        await expect(page.getByText(/Step 3/i)).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Next' }).click();

        // Step 4
        await expect(page.getByText(/Step 4/i)).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Next' }).click();

        // Step 5: Review
        await expect(page.getByText(/Step 5/i)).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('cell', { name: new RegExp(employeeName, 'i') })).toBeVisible();

        // Save
        await page.getByRole('button', { name: /Calculate|Generate/i }).click();
        await page.waitForLoadState('networkidle');

        // Success
        await expect(page.getByText(/Payslips Generated/i)).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: 'View Payslips' }).click();
        await page.waitForLoadState('networkidle');

        // 4. Verify in Payslips List
        await page.reload();
        await expect(page.getByRole('row', { name: new RegExp(employeeName, 'i') })).toBeVisible({ timeout: 5000 });

        // Cleanup
        await page.goto('/employees');
        const employeeRow = page.getByRole('row', { name: new RegExp(employeeName, 'i') });
        if (await employeeRow.isVisible({ timeout: 2000 }).catch(() => false)) {
            await employeeRow.getByRole('cell').last().getByRole('button').last().click();
        }
    });

});
