import { test, expect } from '@playwright/test';

test('Manual Quote Creation Exploration', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Pause for manual exploration
    await page.pause();
});
