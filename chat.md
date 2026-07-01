# Registro de Conversación (2026-06-03)

## 1. Solicitud del Usuario
El usuario reportó que alumnos nuevos (Barraca camilo, Correa martiniano, Gomez laura, Garea elias, Legarreta ines) aparecían en "Presente" por defecto en fechas con asistencias ya registradas (ej. 2026-06-03). Además, solicitó eliminar el botón "Reiniciar hoy a presentes" porque prestaba a confusión.

## 2. Diagnóstico y Causa Raíz
Los alumnos con IDs superiores a 78 son incorporaciones recientes. Al ingresar a ver las asistencias de un día que ya estaba guardado en la base de datos:
1. El frontend cargaba y ponía a todos en "Presente" (`1`) por defecto.
2. Luego, sobreescribía con los datos de asistencia encontrados en la base de datos.
3. Al no existir registros históricos para estos alumnos recién creados en esa fecha pasada, mantenían la inicialización por defecto (`1` - Presente), haciéndolos figurar incorrectamente como presentes.

## 3. Cambios Implementados
- **src/App.tsx**:
  - Se modificó la lógica en `fetchAttendanceForDate` para que, si el día que se consulta ya posee asistencias guardadas (`hasData === true`), los alumnos que no tengan registro en la base de datos se inicialicen por defecto en **"Ausente"** (`0`) en lugar de "Presente". Si es un día nuevo (sin registros guardados), todos inician en "Presente" (`1`) como antes.
  - Se eliminó el botón "Reiniciar hoy a Presentes" de la barra superior.
  - Se removió la función auxiliar descontinuada `resetAttendanceToPresent`.

## 4. Validación
- Se ejecutó `npm run build` localmente, el cual completó satisfactoriamente la validación y compilación de TypeScript y producción de Vite.
- Se actualizaron los archivos `.synapse/workcycle.md` y `.synapse/changelog.md`.

---

# Registro de Conversación (2026-06-30)

## 1. Solicitud del Usuario
El usuario solicitó agregar al joven "Matias Maita" para el grupo de "Emprendedores".

## 2. Acciones Realizadas
- Se verificó que no existiera un alumno duplicado con el nombre "Matias" o apellido "MAITA" en la base de datos de producción (Neon PostgreSQL).
- Se ejecutó la inserción del nuevo registro utilizando la lógica del backend:
  - **Nombre**: `Matias`
  - **Apellido**: `MAITA`
  - **Grupo**: `Emprendedores`
- Se actualizó el archivo de memoria `.synapse/workcycle.md`.

---

# Registro de Conversación (2026-07-01)

## 1. Solicitud del Usuario
El usuario aclaró que el nombre correcto del alumno es "Nicolas Maita", no "Matias Maita".

## 2. Acciones Realizadas
- Se ejecutó un UPDATE en la base de datos de producción (Neon PostgreSQL) para corregir el nombre del ID `85` a `Nicolas`.
- Se actualizaron los archivos `.synapse/workcycle.md` y `.synapse/changelog.md` para reflejar la corrección del nombre.

---

# Registro de Conversación (2026-07-01 - Sesión 2)

## 1. Solicitud del Usuario
El usuario solicitó que las asistencias no cuenten los sábados y domingos (fines de semana).

## 2. Diagnóstico y Causa Raíz
- Se detectaron 5,702 registros de asistencia guardados en fines de semana con valor `0` (Ausente), los cuales se originaron por el script de importación inicial del Excel (`import_excel.py`) que importó los días del 1 al 31 de corrido.
- Estos registros distorsionaban drásticamente el promedio mensual de asistencia y las listas de alumnos críticos con faltas acumuladas irreales.

## 3. Acciones Realizadas
- **Depuración de Base de Datos**: Se eliminaron los 5,702 registros de fin de semana de la tabla `asistencias` en producción.
- **db.js**: Se añadió la variable de dialecto `DIALECT_IS_WEEKDAY` para excluir fines de semana usando SQL nativo en Postgres (`EXTRACT(ISODOW)`) y SQLite (`strftime`).
- **api/index.js**: Se actualizaron los endpoints de estadísticas (`/api/stats/summary` y `/api/stats/critical`) para incluir el filtro de exclusión de fin de semana.
- **src/App.tsx**: Se implementó una lógica que deshabilita el botón de guardar y muestra un banner amigable informando que es fin de semana no laborable si el usuario selecciona un sábado o domingo en la interfaz.
- **Validación**: Se compiló con éxito mediante `npm run build` y se actualizaron los archivos del repositorio.



