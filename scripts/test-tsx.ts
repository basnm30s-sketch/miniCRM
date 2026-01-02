import Database from 'better-sqlite3';
import path from 'path';

console.log('Testing better-sqlite3...');
try {
    const dbPath = path.join(process.cwd(), 'data', 'test-debug.db');
    const db = new Database(dbPath);
    db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY)');
    console.log('Database opened and table created.');
    db.close();
    console.log('Success!');
} catch (e) {
    console.error('Failed:', e);
    process.exit(1);
}
