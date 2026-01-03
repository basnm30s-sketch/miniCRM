import { initDatabase, closeDatabase } from '../lib/database';
import fs from 'fs';
import path from 'path';

// Determine DB path
const dbPath = path.join(process.cwd(), 'data', process.env.DB_FILENAME || 'crm_test.db');

try {
    console.log('Initializing Test DB...');

    // Delete existing test DB to start fresh
    if (fs.existsSync(dbPath)) {
        console.log(`  Removing existing DB at: ${dbPath}`);
        fs.unlinkSync(dbPath);
    }

    // Now initialize fresh
    initDatabase();
    console.log(`Database initialized at: ${dbPath}`);
    console.log('Test DB Initialized successfully.');
} catch (e) {
    console.error('Failed to initialize DB', e);
    process.exit(1);
} finally {
    closeDatabase();
}
