import pandas as pd
import sqlite3
import os

EXCEL_FILE = 'ASISTENCIA 2026.xlsx'
DB_FILE = 'data/asistencias.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Tabla de Alumnos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alumnos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            apellido TEXT,
            nombre TEXT,
            grupo TEXT -- 'Centro de Día' o 'Emprendedores'
        )
    ''')
    
    # Tabla de Asistencias
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS asistencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alumno_id INTEGER,
            fecha TEXT, -- ISO format YYYY-MM-DD
            presente INTEGER, -- 1 o 0
            FOREIGN KEY(alumno_id) REFERENCES alumnos(id)
        )
    ''')
    
    conn.commit()
    return conn

def parse_excel():
    if not os.path.exists(EXCEL_FILE):
        print(f"Error: {EXCEL_FILE} no encontrado.")
        return

    conn = init_db()
    cursor = conn.cursor()

    # Mapeo de meses de las pestañas a números
    meses_map = {
        'ABRIL ': '04',
        'MAYO': '05',
        'JUNIO': '06',
        'JULIO': '07',
        'AGOSTO': '08',
        'SEPTIEMBRE': '09',
        'OCTUBRE': '10',
        'NOVIEMBRE': '11',
        'DICIEMBRE': '12'
    }

    xls = pd.ExcelFile(EXCEL_FILE)
    
    for sheet_name in xls.sheet_names:
        if sheet_name not in meses_map:
            continue
            
        print(f"Procesando mes: {sheet_name}")
        df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
        
        month_num = meses_map[sheet_name]
        year = "2026"
        
        # Identificar secciones
        group = "Centro de Día"
        for idx, row in df.iterrows():
            # Saltar filas vacías o de encabezado
            if pd.isna(row[1]) and pd.isna(row[2]):
                if idx > 10 and "EMPRENDEDORES" in str(row).upper():
                    group = "Emprendedores"
                continue
            
            # Detectar cambio de grupo si no está en fila vacía
            if "EMPRENDEDORES" in str(row[1]).upper() or "EMPRENDEDORES" in str(row[2]).upper():
                group = "Emprendedores"
                continue
            
            # Nombre y Apellido están en col 1 y 2
            apellido = str(row[1]).strip()
            nombre = str(row[2]).strip()
            
            if apellido in ['nan', '', 'None', 'TOTAL CONCURRENTES', 'TOTAL AUXILIARES', 'Referencia: ']:
                continue
            
            # Buscar o crear alumno
            cursor.execute("SELECT id FROM alumnos WHERE apellido = ? AND nombre = ?", (apellido, nombre))
            res = cursor.fetchone()
            if res:
                alumno_id = res[0]
            else:
                cursor.execute("INSERT INTO alumnos (apellido, nombre, grupo) VALUES (?, ?, ?)", (apellido, nombre, group))
                alumno_id = cursor.lastrowid
            
            # Leer asistencias (Columnas 3 en adelante son días 1, 2, 3...)
            # Nota: Pandas asigna nombres de columnas 0, 1, 2, 3... si header=None
            for day in range(1, 32):
                col_idx = 2 + day # El día 1 está en la columna 3 (index 3)
                if col_idx >= len(row):
                    break
                    
                val = row[col_idx]
                presente = 1 if val == 1 or val == 1.0 else 0
                
                # Formatear fecha
                try:
                    fecha = f"{year}-{month_num}-{str(day).zfill(2)}"
                    # Evitar duplicados si re-corremos el script
                    cursor.execute("SELECT id FROM asistencias WHERE alumno_id = ? AND fecha = ?", (alumno_id, fecha))
                    if not cursor.fetchone():
                        cursor.execute("INSERT INTO asistencias (alumno_id, fecha, presente) VALUES (?, ?, ?)", (alumno_id, fecha, presente))
                except:
                    pass # Fecha inválida (ej 31 de abril)

    conn.commit()
    conn.close()
    print("Migración completada con éxito.")

if __name__ == "__main__":
    parse_excel()
