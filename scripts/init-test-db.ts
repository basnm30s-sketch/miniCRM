import { initDatabase, closeDatabase } from '../lib/database';

try {
    console.log('Initializing Test DB...');
    initDatabase();
    console.log('Test DB Initialized successfully.');
} catch (e) {
    console.error('Failed to initialize DB', e);
    process.exit(1);
} finally {
    closeDatabase();
}
