
const sqlite = require('better-sqlite3');
const db = new sqlite('data/asistencias.db');

console.log('--- DB SANITIZATION START ---');

const junkIds = db.prepare("SELECT id FROM alumnos WHERE apellido LIKE 'Referencia%' OR apellido LIKE '%APELLIDO%' OR nombre LIKE 'nan' OR apellido = 'INGRESOS'").all();
console.log(`Found ${junkIds.length} junk records:`, junkIds.map(j => j.id));

if (junkIds.length > 0) {
    const ids = junkIds.map(j => j.id);
    const placeholders = ids.map(() => '?').join(',');
    
    const transaction = db.transaction(() => {
        // Delete related attendances first
        const delAsist = db.prepare(`DELETE FROM asistencias WHERE alumno_id IN (${placeholders})`).run(...ids);
        console.log(`Deleted ${delAsist.changes} related attendance records.`);
        
        // Delete junk students
        const delAlumnos = db.prepare(`DELETE FROM alumnos WHERE id IN (${placeholders})`).run(...ids);
        console.log(`Deleted ${delAlumnos.changes} junk student records.`);
    });
    
    transaction();
    console.log('Sanitization complete.');
} else {
    console.log('No junk records found.');
}

db.close();
