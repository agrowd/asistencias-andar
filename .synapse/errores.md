# ERR-01: SQLite Query Syntax Error (2026-04-21)
**Síntoma:** Error 500 al cargar alumnos.
**Root Cause:** Uso de comillas dobles en literales de string en SQLite, interpretados como nombres de columna.
**Solución:** Cambiar a comillas simples.
**Commit:** `fix/sqlite-syntax`
**Estado:** ✅ FIXED
