import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Electron App Lifecycle', () => {
    test('App should launch and display window', async () => {
        // Launch the app (validates full launch and dashboard visibility)
        const electronApp = await electron.launch({
            args: ['.'],
            env: {
                ...process.env,
                NODE_ENV: 'development',
            }
        });

        try {
            const window = await electronApp.firstWindow();
            await window.waitForLoadState('domcontentloaded');

            // Verify window title (set by Next.js app once loaded)
            const title = await window.title();
            console.log(`Window title: ${title}`);
            expect(title).toMatch(/ALMSAR ALZAKI/i);

            // Ensure we did not load the Electron fallback error page
            await expect(window.getByText('Application Error')).not.toBeVisible();
            await expect(window.getByText('Could not connect to Express server')).not.toBeVisible();

            // App shell (main content area from LayoutWrapper)
            await expect(window.locator('main')).toBeVisible({ timeout: 10000 });

            // Navigation (sidebar)
            await expect(window.getByRole('link', { name: 'Home' })).toBeVisible({ timeout: 5000 });

            // Dashboard content (confirms we are on / and React has rendered)
            await expect(window.getByRole('heading', { name: /Quotations & Invoices/i })).toBeVisible({ timeout: 10000 });

            // screenshot for validation
            await window.screenshot({ path: 'test-results-electron/launch-screenshot.png' });
        } finally {
            // Close the app
            await electronApp.close();
        }
    });
});
