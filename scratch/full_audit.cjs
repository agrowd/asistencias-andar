
const sqlite = require('better-sqlite3');
const db = new sqlite('data/asistencias.db');

console.log('--- TABLES ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

for (const table of tables) {
    console.log(`\n--- SCHEMA: ${table.name} ---`);
    console.log(db.prepare(`PRAGMA table_info(${table.name})`).all());
}

console.log('\n--- JUNK ALUMNOS CHECK ---');
const junk = db.prepare("SELECT * FROM alumnos WHERE apellido LIKE 'Referencia%' OR apellido LIKE '%APELLIDO%' OR nombre LIKE 'nan'").all();
console.log('Junk found:', junk.length);
console.log(junk);

console.log('\n--- USERS ---');
console.log(db.prepare('SELECT id, username, rol FROM usuarios').all());

db.close();
