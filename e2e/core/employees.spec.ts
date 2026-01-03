import { test, expect } from '@playwright/test';

test.describe('Employees Module', () => {

    test('Employee Management', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const employeeName = `Worker ${uniqueId}`;
        const employeeId = `EMP-${uniqueId.slice(-4)}`;

        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // CREATE
        await page.goto('/employees');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Add Employee' }).click();
        await page.getByPlaceholder('Name').fill(employeeName);
        await page.getByPlaceholder('Employee ID').fill(employeeId);

        // Role
        const roleInput = page.getByPlaceholder('Role');
        if (await roleInput.isVisible({ timeout: 500 }).catch(() => false)) {
            await roleInput.fill('Technician');
        }

        // Payment Type
        await page.getByLabel('Hourly').click();

        // Hourly Pay
        const hourlyPay = page.getByPlaceholder('Hourly Pay').or(page.getByLabel('Hourly Pay'));
        await hourlyPay.scrollIntoViewIfNeeded();
        await hourlyPay.fill('50');

        await page.getByRole('button', { name: 'Create' }).click();
        await page.waitForLoadState('networkidle');

        // Verify
        await expect(page.getByRole('row', { name: new RegExp(employeeName, 'i') })).toBeVisible({ timeout: 5000 });

        // EDIT
        await page.getByRole('row', { name: new RegExp(employeeName, 'i') }).getByRole('cell').last().getByRole('button').first().click();
        await page.waitForLoadState('networkidle');

        const editRoleInput = page.getByPlaceholder('Role');
        if (await editRoleInput.isVisible({ timeout: 500 }).catch(() => false)) {
            await editRoleInput.fill('Senior Technician');
        }

        await page.getByRole('button', { name: 'Update' }).click();
        await page.waitForLoadState('networkidle');

        // Verify Update
        await expect(page.getByRole('row', { name: new RegExp(employeeName, 'i') })).toBeVisible();

        // DELETE
        await page.getByRole('row', { name: new RegExp(employeeName, 'i') }).getByRole('cell').last().getByRole('button').last().click();

        // Verify Removal
        await page.waitForTimeout(500);
        await expect(page.getByRole('row', { name: new RegExp(employeeName, 'i') })).not.toBeVisible();
    });

});
