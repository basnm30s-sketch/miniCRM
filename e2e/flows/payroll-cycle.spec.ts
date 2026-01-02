import { test, expect } from '@playwright/test';

test.describe('Payroll Cycle', () => {

    test('Should generate a payslip for an employee', async ({ page }) => {
        // 1. Create Employee
        await page.goto('/employees');
        await page.getByRole('button', { name: 'Add Employee' }).click();
        await page.getByLabel('Name').fill('Jane Payroll');
        await page.getByLabel('Designation').fill('Driver'); // Assuming label logic
        // OR if fields are "Employee ID", "Role", etc.
        // I recall fields: Name, Role, Email...
        await page.locator('input[name="role"]').fill('Driver');
        await page.locator('input[name="salary"]').fill('3000');
        // Save
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Jane Payroll')).toBeVisible();

        // 2. Generate Payslip
        await page.goto('/payslips');
        await page.getByRole('button', { name: 'Generate Payslip' }).click();

        // Select Employee
        await page.getByRole('combobox', { name: 'Employee' }).click();
        await page.getByLabel('Jane Payroll').click();

        // Select Month (e.g. Current Month)
        // Assuming date picker or month picker
        // For test stability, we might need to handle specific inputs
        await page.locator('input[name="month"]').fill('2025-10'); // YYYY-MM

        // Check Auto-fill (Salary should be 3000)
        await expect(page.locator('input[name="baseSalary"]')).toHaveValue('3000');

        // Add Overtime
        await page.locator('input[name="overtimePay"]').fill('200');

        // Save
        await page.getByRole('button', { name: 'Save' }).click();

        // 3. Verify in List
        await expect(page.getByText('Jane Payroll')).toBeVisible();
        await expect(page.getByText('2025-10')).toBeVisible(); // Month
        await expect(page.getByText('3200')).toBeVisible(); // Total Net Pay (roughly)

        // 4. Duplicate Check
        await page.getByRole('button', { name: 'Generate Payslip' }).click();
        await page.getByRole('combobox', { name: 'Employee' }).click();
        await page.getByLabel('Jane Payroll').click();
        await page.locator('input[name="month"]').fill('2025-10');
        await page.getByRole('button', { name: 'Save' }).click();

        // Expect Error Toast/Message
        await expect(page.getByText('already exists')).toBeVisible();
    });

});
