# 🌊 Logic Flows Graph

```mermaid
graph TD
    Excel[ASISTENCIA 2026.xlsx] -->|Parsing| DB[(Database)]
    DB --> CRM[Web Interface]
    CRM -->|Profesor Input| DB
    CRM -->|Dashboards/Reportes| Admin[Visualización Admin]
```
