/**
 * Migration Script: Populate vehicleNumber for existing vehicles
 * 
 * This script updates all vehicles in the database that have empty vehicleNumber
 * by generating unique vehicle numbers based on their type.
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'test_debug.db');
const db = new Database(dbPath);

console.log(`Using database: ${dbPath}`);

console.log('Starting vehicle migration...');

// Get all vehicles without vehicleNumber
const vehicles = db.prepare('SELECT id, type, vehicleType FROM vehicles WHERE vehicleNumber IS NULL OR vehicleNumber = ""').all();

console.log(`Found ${vehicles.length} vehicles without vehicleNumber`);

let updated = 0;
for (const vehicle of vehicles) {
    // Generate a unique vehicle number based on type
    const typePrefix = (vehicle.vehicleType || vehicle.type || 'VEH').substring(0, 3).toUpperCase();
    const uniqueId = Date.now() + updated;
    const vehicleNumber = `${typePrefix}-${uniqueId}`;

    // Update the vehicle
    db.prepare('UPDATE vehicles SET vehicleNumber = ? WHERE id = ?').run(vehicleNumber, vehicle.id);

    console.log(`Updated vehicle ${vehicle.id}: ${vehicleNumber}`);
    updated++;
}

console.log(`Migration complete! Updated ${updated} vehicles.`);

db.close();
