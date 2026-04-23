const sqlite = require('better-sqlite3');
const db = new sqlite('data/asistencias.db');

console.log('TABLES:');
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());

console.log('\nASISTENCIAS SCHEMA:');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name='asistencias'").get());

console.log('\nALUMNOS SCHEMA:');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name='alumnos'").get());
