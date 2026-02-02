import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Electron App Lifecycle', () => {
    test('App should launch and display window', async () => {
        // Launch the app
        // We point to the main entry point defined in package.json
        const electronApp = await electron.launch({
            args: ['.'],
            env: {
                ...process.env,
                NODE_ENV: 'development',
            }
        });

        try {
            // Get the first window
            const window = await electronApp.firstWindow();

            // Verify window title
            // Note: Title might be "iManage - Car Rental CRM" or similar based on main.js
            const title = await window.title();
            console.log(`Window title: ${title}`);
            expect(title).toMatch(/iManage/i);

            // Verify basic content to ensure React loaded
            // We look for the "iManage" heading or similar dashboard element
            await expect(window.locator('body')).toBeVisible();

            // Take a screenshot for validaton
            await window.screenshot({ path: 'test-results-electron/launch-screenshot.png' });

        } finally {
            // Close the app
            await electronApp.close();
        }
    });
});
