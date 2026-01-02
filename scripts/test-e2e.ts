import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'crm.db');
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'crm_test.db');
const TEST_DB_SOURCE = path.join(process.cwd(), 'data', 'crm_test_seed.db'); // Optional: A pre-seeded DB

async function runE2E() {
    console.log('🚀 Setting up E2E Environment...');

    // 1. Swap DB Environment Variable
    process.env.DB_FILENAME = 'crm_test.db';
    process.env.NODE_ENV = 'test';

    // 2. Prepare Test DB
    try {
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }

        // Create an empty DB or copy from seed
        // For now, we'll let the application migration/init logic create it
        // Or we can run the populate script designated for tests
        console.log('📦 Cleaned Test Database');

        // Initialize clean DB (Schema only)
        console.log('🌱 Initializing Test Schema...');
        execSync('npx tsx scripts/init-test-db.ts', {
            env: { ...process.env, DB_FILENAME: 'crm_test.db' },
            stdio: 'inherit'
        });

    } catch (error) {
        console.error('❌ Failed to setup test DB:', error);
        process.exit(1);
    }

    // 3. Run Playwright
    console.log('🎭 Running Playwright Tests...');
    try {
        execSync('npx playwright test', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Tests Failed');
        process.exit(1);
    }
}

runE2E();
