
import XLSX from 'xlsx';

const workbook = XLSX.readFile('ASISTENCIA 2026.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log("EXCEL HEADER (first 2 rows):");
console.log(data.slice(0, 5));
