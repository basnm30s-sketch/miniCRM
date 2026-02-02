import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e/electron',
    outputDir: 'test-results-electron',
    timeout: 30000,
    retries: 0,
    workers: 1, // Electron tests should run sequentially
    reporter: 'html',
    use: {
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'Electron',
            use: {
                // Electron tests use a custom launcher, so no browser device needed here
            },
        },
    ],
});
