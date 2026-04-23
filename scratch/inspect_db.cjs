
const sqlite = require('better-sqlite3');
const db = new sqlite('data/asistencias.db');

const alumnosCount = db.prepare('SELECT count(*) as count FROM alumnos').get().count;
const asistenciasCount = db.prepare('SELECT count(*) as count FROM asistencias').get().count;
const sampleAlumnos = db.prepare('SELECT * FROM alumnos LIMIT 5').all();
const sampleAsistencias = db.prepare('SELECT * FROM asistencias LIMIT 5').all();

console.log('Alumnos Count:', alumnosCount);
console.log('Asistencias Count:', asistenciasCount);
console.log('Sample Alumnos:', JSON.stringify(sampleAlumnos, null, 2));
console.log('Sample Asistencias:', JSON.stringify(sampleAsistencias, null, 2));

db.close();
