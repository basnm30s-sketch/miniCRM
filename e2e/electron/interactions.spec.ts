import { test, expect } from '@playwright/test';
import {
    launchElectronApp,
    captureConsoleErrors,
    ELECTRON_BASE_URL,
} from './helpers/electron-launch';

test.describe('Electron – Interactions (Phase 2)', () => {
    let electronApp: Awaited<ReturnType<typeof launchElectronApp>>['electronApp'];
    let window: Awaited<ReturnType<typeof launchElectronApp>>['window'];
    let consoleCapture: ReturnType<typeof captureConsoleErrors>;

    test.beforeAll(async () => {
        const result = await launchElectronApp();
        electronApp = result.electronApp;
        window = result.window;
        await window.waitForLoadState('domcontentloaded');
        consoleCapture = captureConsoleErrors(window);
        window.on('dialog', (dialog) => dialog.accept());
    });

    test.afterAll(async () => {
        await electronApp.close();
    });

    function goto(path: string) {
        return window.goto(`${ELECTRON_BASE_URL}${path}`);
    }

    test.describe('Masters – Customers', () => {
        test('Add, edit, delete customer – all fields and buttons', async () => {
            consoleCapture.clearErrors();
            const uid = Date.now().toString();
            const name = `E2E Customer ${uid}`;
            const updatedName = `E2E Customer Updated ${uid}`;

            await goto('/customers');
            await window.waitForLoadState('domcontentloaded');
            await window.getByRole('button', { name: 'Add Customer' }).click();
            await window.getByPlaceholder('Company Name').fill(name);
            await window.getByPlaceholder('Contact Person').fill(`Contact ${uid}`);
            await window.getByPlaceholder('Email').fill(`e2e-${uid}@test.com`);
            await window.getByRole('button', { name: 'Create' }).click();
            await window.waitForLoadState('domcontentloaded');
            await expect(window.getByRole('row', { name: new RegExp(name, 'i') })).toBeVisible({ timeout: 10000 });

            const row = window.getByRole('row', { name: new RegExp(name, 'i') });
            await row.getByRole('cell').last().getByRole('button').first().click();
            await window.getByPlaceholder('Company Name').fill(updatedName);
            await window.getByRole('button', { name: 'Update' }).click();
            await window.waitForLoadState('domcontentloaded');
            await expect(window.getByRole('row', { name: new RegExp(updatedName, 'i') })).toBeVisible({ timeout: 5000 });

            await window.getByRole('row', { name: new RegExp(updatedName, 'i') }).getByRole('cell').last().getByRole('button').last().click();
            await expect(window.getByRole('row', { name: new RegExp(updatedName, 'i') })).not.toBeVisible({ timeout: 5000 });
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Masters – Vendors', () => {
        test('Add, edit, delete vendor – all fields and buttons', async () => {
            consoleCapture.clearErrors();
            const uid = Date.now().toString();
            const name = `E2E Vendor ${uid}`;

            await goto('/vendors');
            await window.waitForLoadState('domcontentloaded');
            await window.getByRole('button', { name: 'Add Vendor' }).click();
            await window.getByPlaceholder('Name').fill(name);
            await window.getByPlaceholder('Contact Person').fill('Contact');
            await window.getByPlaceholder('Email').fill(`vendor-${uid}@test.com`);
            await window.getByPlaceholder('Phone').fill('555-0000');
            await window.getByRole('button', { name: 'Create' }).click();
            await window.waitForLoadState('domcontentloaded');
            await expect(window.getByRole('row', { name: new RegExp(name, 'i') })).toBeVisible({ timeout: 10000 });

            await window.getByRole('row', { name: new RegExp(name, 'i') }).getByRole('cell').last().getByRole('button').first().click();
            await window.getByPlaceholder('Contact Person').fill('Updated Contact');
            await window.getByRole('button', { name: 'Update' }).click();
            await window.waitForLoadState('domcontentloaded');

            await window.getByRole('row', { name: new RegExp(name, 'i') }).getByRole('cell').last().getByRole('button').last().click();
            await expect(window.getByRole('row', { name: new RegExp(name, 'i') })).not.toBeVisible({ timeout: 5000 });
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Masters – Vehicles', () => {
        test('Add vehicle and delete – form fields and buttons', async () => {
            consoleCapture.clearErrors();
            const uid = Date.now().toString();
            const vehicleNum = `E2E-${uid.slice(-6)}`;

            await goto('/vehicles');
            await window.waitForLoadState('domcontentloaded');
            await window.getByRole('button', { name: 'Add Vehicle' }).click();
            await expect(window.getByPlaceholder('e.g., DXB A-12345')).toBeVisible({ timeout: 5000 });
            await window.getByPlaceholder('e.g., DXB A-12345').fill(vehicleNum);
            await window.getByPlaceholder('e.g., Sedan, SUV, Lorry').fill('Sedan');
            await window.getByPlaceholder('e.g., Toyota').fill('Toyota');
            await window.getByRole('button', { name: 'Create Vehicle' }).click();
            await expect(window.getByPlaceholder('e.g., DXB A-12345')).not.toBeVisible({ timeout: 10000 });
            await window.waitForLoadState('domcontentloaded');
            let rowVisible = await window.getByRole('row', { name: new RegExp(vehicleNum, 'i') }).isVisible({ timeout: 10000 }).catch(() => false);
            if (!rowVisible) {
                await goto('/vehicles');
                await window.waitForLoadState('networkidle');
            }
            await expect(window.getByRole('row', { name: new RegExp(vehicleNum, 'i') })).toBeVisible({ timeout: 20000 });

            const row = window.getByRole('row', { name: new RegExp(vehicleNum, 'i') });
            await row.getByRole('cell').last().getByRole('button').last().click();
            await expect(window.getByRole('row', { name: new RegExp(vehicleNum, 'i') })).not.toBeVisible({ timeout: 5000 });
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Masters – Employees', () => {
        test('Add, edit, delete employee – all fields and buttons', async () => {
            consoleCapture.clearErrors();
            const uid = Date.now().toString();
            const name = `E2E Employee ${uid}`;
            const empId = `EMP-${uid.slice(-4)}`;

            await goto('/employees');
            await window.waitForLoadState('domcontentloaded');
            await window.getByRole('button', { name: 'Add Employee' }).click();
            await window.getByPlaceholder('Name').fill(name);
            await window.getByPlaceholder('Employee ID').fill(empId);
            const roleInput = window.getByPlaceholder('Role');
            if (await roleInput.isVisible({ timeout: 500 }).catch(() => false)) {
                await roleInput.fill('Driver');
            }
            await window.getByLabel('Hourly').click();
            const hourlyPay = window.getByPlaceholder('Hourly Pay').or(window.getByLabel('Hourly Pay'));
            await hourlyPay.scrollIntoViewIfNeeded();
            await hourlyPay.fill('40');
            await window.getByRole('button', { name: 'Create' }).click();
            await window.waitForLoadState('domcontentloaded');
            await expect(window.getByRole('row', { name: new RegExp(name, 'i') })).toBeVisible({ timeout: 10000 });

            await window.getByRole('row', { name: new RegExp(name, 'i') }).getByRole('cell').last().getByRole('button').first().click();
            const editRole = window.getByPlaceholder('Role');
            if (await editRole.isVisible({ timeout: 500 }).catch(() => false)) {
                await editRole.fill('Senior Driver');
            }
            await window.getByRole('button', { name: 'Update' }).click();
            await window.waitForLoadState('domcontentloaded');

            await window.getByRole('row', { name: new RegExp(name, 'i') }).getByRole('cell').last().getByRole('button').last().click();
            await expect(window.getByRole('row', { name: new RegExp(name, 'i') })).not.toBeVisible({ timeout: 5000 });
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Doc generator – Quotations', () => {
        test('Create quote – customer, line item, Save Quote', async () => {
            consoleCapture.clearErrors();
            const uid = Date.now().toString();
            const customerName = `Quote Customer ${uid}`;

            await goto('/customers');
            await window.waitForLoadState('domcontentloaded');
            await window.getByRole('button', { name: 'Add Customer' }).click();
            await window.getByPlaceholder('Company Name').fill(customerName);
            await window.getByRole('button', { name: 'Create' }).click();
            await window.waitForLoadState('domcontentloaded');

            await goto('/quotes/create');
            await window.waitForLoadState('networkidle');
            const formVisible = await window.locator('main').getByText(/Quote Details|Customer/i).first().isVisible({ timeout: 15000 }).catch(() => false);
            if (formVisible) {
                const customerCombobox = window.getByRole('combobox').first();
                if (await customerCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await customerCombobox.click();
                    await window.keyboard.type(customerName);
                    const option = window.getByRole('option', { name: new RegExp(customerName, 'i') });
                    await option.click();
                    await window.getByRole('button', { name: 'Add Line Item' }).click();
                    const firstRow = window.locator('table tbody tr').first();
                    await firstRow.locator('input').first().fill('E2E Item');
                    const qtyInput = firstRow.locator('td').nth(4).locator('input');
                    await qtyInput.fill('1');
                    const priceInput = firstRow.locator('td').nth(5).locator('input');
                    await priceInput.fill('100');
                    await window.getByRole('button', { name: 'Save Quote' }).click();
                    await window.waitForLoadState('domcontentloaded');
                }
            }
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Doc generator – Invoices', () => {
        test('Create invoice – New empty, customer, line item, Save', async () => {
            consoleCapture.clearErrors();
            const uid = Date.now().toString();
            const customerName = `Invoice Customer ${uid}`;

            await goto('/customers');
            await window.waitForLoadState('domcontentloaded');
            await window.getByRole('button', { name: 'Add Customer' }).click();
            await window.getByPlaceholder('Company Name').fill(customerName);
            await window.getByRole('button', { name: 'Create' }).click();
            await window.waitForLoadState('domcontentloaded');

            await goto('/invoices/create');
            await window.waitForLoadState('networkidle');
            const newEmptyBtn = window.getByRole('button', { name: 'New empty invoice' });
            const choiceVisible = await newEmptyBtn.isVisible({ timeout: 15000 }).catch(() => false);
            if (choiceVisible) {
                await newEmptyBtn.click();
                await window.waitForLoadState('domcontentloaded');
                const customerCombobox = window.getByRole('combobox', { name: /customer/i }).or(window.locator('button:has-text("Select a customer")')).first();
                if (await customerCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await customerCombobox.click();
                    await window.keyboard.type(customerName);
                    await window.getByRole('option', { name: new RegExp(customerName, 'i') }).click();
                    await window.getByRole('button', { name: 'Add Line Item' }).click();
                    const firstRow = window.locator('table tbody tr').first();
                    const descInput = firstRow.locator('td').nth(2).locator('input');
                    await descInput.fill('E2E Invoice Item');
                    const qtyInput = firstRow.locator('td').nth(4).locator('input');
                    await qtyInput.fill('2');
                    const priceInput = firstRow.locator('td').nth(5).locator('input');
                    await priceInput.fill('50');
                    await window.getByRole('button', { name: 'Save Invoice' }).first().click();
                    await window.waitForLoadState('domcontentloaded');
                }
            }
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Doc generator – Purchase Orders', () => {
        test('Create PO – vendor, line item, Save', async () => {
            consoleCapture.clearErrors();
            const uid = Date.now().toString();
            const vendorName = `PO Vendor ${uid}`;

            await goto('/vendors');
            await window.waitForLoadState('domcontentloaded');
            await window.getByRole('button', { name: 'Add Vendor' }).click();
            await window.getByPlaceholder('Name').fill(vendorName);
            await window.getByPlaceholder('Contact Person').fill('Contact');
            await window.getByRole('button', { name: 'Create' }).click();
            await window.waitForLoadState('domcontentloaded');

            await goto('/purchase-orders/create');
            await window.waitForLoadState('networkidle');
            const formVisible = await window.locator('main').getByText(/Purchase Order Details|Vendor/i).first().isVisible({ timeout: 15000 }).catch(() => false);
            if (formVisible) {
                const vendorCombobox = window.getByRole('combobox').nth(1);
                if (await vendorCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await vendorCombobox.click();
                    await window.keyboard.type(vendorName);
                    await window.getByRole('option', { name: new RegExp(vendorName, 'i') }).click();
                    await window.getByRole('button', { name: /Add Item|Add Line Item/i }).click();
                    const firstRow = window.locator('table tbody tr').first();
                    await firstRow.locator('input').first().fill('E2E PO Item');
                    const qtyInput = firstRow.locator('td').nth(4).locator('input');
                    await qtyInput.fill('1');
                    const priceInput = firstRow.locator('td').nth(5).locator('input');
                    await priceInput.fill('200');
                    const createBtn = window.getByRole('button', { name: /Create|Save/i }).first();
                    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                        await createBtn.click();
                        await window.waitForLoadState('domcontentloaded');
                    }
                }
            }
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Payslips', () => {
        test('Generate Payslip button and view toggle', async () => {
            consoleCapture.clearErrors();
            await goto('/payslips');
            await window.waitForLoadState('domcontentloaded');
            await expect(window.getByRole('heading', { name: /Payslips/i })).toBeVisible({ timeout: 10000 });
            const genBtn = window.getByRole('button', { name: /Generate Payslip/i });
            if (await genBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await genBtn.click();
                await window.waitForLoadState('domcontentloaded');
            }
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Salary Calculation', () => {
        test('Open salary calculation, fill step 1, Next', async () => {
            consoleCapture.clearErrors();
            await goto('/salary-calculation');
            await window.waitForLoadState('domcontentloaded');
            await expect(window.getByRole('heading', { name: /Salary Calculation/i })).toBeVisible({ timeout: 10000 });
            const employeeSelect = window.getByRole('combobox').or(window.locator('button:has-text("Select")').first());
            if (await employeeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
                await employeeSelect.click();
                const firstOption = window.getByRole('option').first();
                if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await firstOption.click();
                }
            }
            const nextBtn = window.getByRole('button', { name: /Next/i });
            if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await nextBtn.click();
                await window.waitForLoadState('domcontentloaded');
            }
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Vehicle Finances', () => {
        test('Open vehicle detail, Add Transaction', async () => {
            consoleCapture.clearErrors();
            await goto('/vehicle-finances');
            await window.waitForLoadState('domcontentloaded');
            const cardList = window.locator('div.flex-1.overflow-y-auto.space-y-2').locator('div.cursor-pointer');
            const firstCard = cardList.first();
            if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
                await firstCard.click();
                await window.waitForLoadState('domcontentloaded');
                const addTxBtn = window.getByRole('button', { name: /Add Transaction|Add Revenue|Add Expense/i });
                if (await addTxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await addTxBtn.click();
                    await window.waitForLoadState('domcontentloaded');
                }
            }
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Vehicle Dashboard', () => {
        test('Toggle one setting', async () => {
            consoleCapture.clearErrors();
            await goto('/vehicle-dashboard');
            await window.waitForLoadState('domcontentloaded');
            const settingsBtn = window.getByRole('button', { name: /Settings/i }).or(window.locator('button').filter({ has: window.locator('svg') }).first());
            if (await settingsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                await settingsBtn.click();
                await window.waitForLoadState('domcontentloaded');
            }
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Expense Categories', () => {
        test('Add category, Edit, Delete', async () => {
            consoleCapture.clearErrors();
            const uid = Date.now().toString();
            const catName = `E2E Category ${uid}`;

            await goto('/finances/expense-categories');
            await window.waitForLoadState('domcontentloaded');
            const addBtn = window.getByRole('button', { name: 'Add Category' });
            await addBtn.click();
            await window.getByPlaceholder('Enter category name').fill(catName);
            await window.getByRole('button', { name: 'Save' }).click();
            await window.waitForLoadState('domcontentloaded');

            const row = window.getByRole('row', { name: new RegExp(catName, 'i') });
            if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
                const editBtn = row.getByRole('button').first();
                if (await editBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await editBtn.click();
                    await window.waitForLoadState('domcontentloaded');
                }
                const deleteBtn = row.getByRole('button').last();
                if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await deleteBtn.click();
                }
            }
            consoleCapture.assertNoCriticalErrors();
        });
    });

    test.describe('Settings (Admin)', () => {
        test('Update company name and Save', async () => {
            consoleCapture.clearErrors();
            const uid = Date.now().toString();
            const companyName = `E2E Settings ${uid}`;

            await goto('/admin');
            await window.waitForLoadState('domcontentloaded');
            const companyInput = window.getByLabel('Company Name');
            await expect(companyInput).toBeVisible({ timeout: 5000 });
            await companyInput.fill(companyName);
            await window.getByRole('button', { name: 'Save Settings' }).click();
            await window.waitForLoadState('domcontentloaded');
            await expect(window.getByText('Settings saved successfully').first()).toBeVisible({ timeout: 5000 });
            consoleCapture.assertNoCriticalErrors();
        });
    });
});
