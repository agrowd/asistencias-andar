
import db from '../db.js';

async function check() {
    try {
        console.log("Checking Tables...");
        const tables = await db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
        console.log("TABLES:", JSON.stringify(tables, null, 2));

        console.log("\nChecking Users...");
        const users = await db.prepare("SELECT id, username, rol FROM usuarios").all();
        console.log("USERS:", JSON.stringify(users, null, 2));
    } catch (e) {
        console.error("ERROR:", e);
    }
    process.exit(0);
}

check();
