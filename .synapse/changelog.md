## [1.2.0] - 2026-04-27
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
