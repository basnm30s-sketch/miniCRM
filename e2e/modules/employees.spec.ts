import { test, expect } from '@playwright/test';

test.describe('Employees Module', () => {

    test('Employee Management', async ({ page }) => {
        // Create
        await page.goto('/employees');
        await page.getByRole('button', { name: 'Add Employee' }).click();
        await page.getByLabel('Name').fill('John Worker');
        await page.getByLabel('Designation').fill('Technician');
        // ... other fields
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('John Worker')).toBeVisible();

        // Edit
        await page.getByRole('row', { name: 'John Worker' }).getByRole('button', { name: 'Edit' }).click();
        await page.getByLabel('Designation').fill('Senior Technician');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Senior Technician')).toBeVisible();

        // Delete
        await page.getByRole('row', { name: 'John Worker' }).getByRole('button', { name: 'Delete' }).click();
        await page.getByRole('button', { name: 'Confirm' }).click();
        await expect(page.getByText('John Worker')).not.toBeVisible();
    });

});
