## [1.2.7] - 2026-07-01
### Added
- Blindaje contra fines de semana en reportes y estadísticas (promedio mensual y faltas críticas) a nivel de base de datos usando dialéctica condicional SQL (PostgreSQL/SQLite).
- Bloqueo en la interfaz de asistencias para días sábados y domingos con aviso instructivo y botón de guardar deshabilitado.
### Fixed
- Depuración y eliminación de 5,702 registros de fin de semana guardados por error en la base de datos de producción.

## [1.2.6] - 2026-06-30
### Added
- Alta del concurrente Nicolas Maita en el grupo de Emprendedores directamente en la base de datos de producción (ID: 85) (corregido de Matias el 2026-07-01).


## [1.2.5] - 2026-06-03
### Added
- Lógica inteligente de inicialización: Los alumnos sin registros en fechas cerradas aparecen por defecto en "Ausente", previniendo que concurrentes nuevos figuren como "Presente" en días pasados.
### Removed
- Botón "Reiniciar hoy a Presentes" de la interfaz de asistencias para evitar confusiones en la carga.


## [1.2.4] - 2026-04-27
### Added
- Filtro por grupo (Centro de Día / Emprendedores) en el módulo "Sábana Mensual".
- Exportación a Excel dinámica que respeta los filtros aplicados.
- Diseño 100% Responsive: Sidebar hamburguesa deslizable y layout optimizado para Mobile.
### Fixed
- Error de importación del icono `Lock`.
- Mismatched tags JSX en el componente principal.


## [1.2.3] - 2026-04-27
### Added
- Módulo "Sábana Mensual" (Grilla estilo Excel).
- Lista de usuarios en Administración con opción de eliminar profesores.
### Fixed
- Error en la creación de usuarios que impedía guardar nuevos profesores.

### Added
- Nuevo campo `observacion` en base de datos para justificaciones.
- Modal automático de justificación al marcar falta justificada.
- Vista de historial organizada y separada por grupos (Centro de Día / Emprendedores).
- Migración de esquema en Neon PostgreSQL.

## [1.2.2] - 2026-04-27
### Fixed
- JSX syntax errors in `App.tsx`.
- Attendance flicker where students appeared absent on first load.
### Added
- "Reset Today to Present" button in attendance view.
- Grouped view in Reports (matching History).
- System version label in sidebar.

## [1.0.0] - 2026-04-27
### Added
- Despliegue oficial en Vercel.
- Conexión con Neon PostgreSQL (Cloud).
- Manejo de errores de sesión automático (Auto-logout on 401/403).
- Lógica de asistencia invertida: **Ausente por defecto** (0), clic para marcar Presente (1).
- Verificación final de integridad de datos.

- **v1.0.0**: CRM inicial con Glassmorphism, Backend Express, y gestión de asistencias funcional.
- **v1.0**: Sistema base, Autenticación, CRUD, Historial.
- **v1.1**: Responsive, Exportación Excel/PDF, Lógica Inversa, Atribución de Profesores.
- **v1.2**: Soporte Vercel, Neon DB, Sesiones robustas.
