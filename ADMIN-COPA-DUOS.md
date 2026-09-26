# Copa Dúos — administración

Acceso: **Admin → Competiciones → elegir temporada → Administrar Copa Dúos**.

## Flujo

1. En configuración general crear una etapa **Tabla eliminatoria** con las Fechas de supervivencia en orden; luego dos etapas **Eliminación directa**, Semifinal y Final, con sus Fechas de 12 partidos. Construir los cruces antes de publicar/iniciar las Fechas destino.
2. **Parejas**: cargar manualmente los dos integrantes de cada dúo. Todos los activos de A/B deben aparecer exactamente una vez. El modo manual no genera semilla. El botón de sorteo es opcional y conserva su seed. Una cantidad impar bloquea el armado hasta resolución del Admin. No se permite reemplazar parejas ya creadas.
3. **Parejas → Historial de integrantes / Cambiar integrante**: seleccionar saliente, entrante activo de la temporada y Fecha efectiva. El entrante no puede superponerse con otro dúo. La salida tiene límite superior exclusivo. Los snapshots anteriores conservan nombres, integrantes y puntos.
4. **Fechas**: configurar eliminados y bonus por posición; guardar y revisar tabla, eliminados propuestos y sobrevivientes. Cada Fecha comienza con cero puntos deportivos; sólo recibe el bonus persistido. Ausentes aportan cero.
5. **Confirmar Fecha de Dúos**: requiere resultados definitivos y confirmación de las Fechas anteriores de supervivencia. Guarda snapshot, elimina, asigna bonus y audita en un batch. No puede repetirse ni editarse desde el flujo normal.
6. Si hay empate en el corte o en los puestos necesarios para semifinales, **Administrar desempate de tabla TAFA**, vincular una Fecha **Liga posterior**, evaluar y confirmar. Los dúos empatados se comparan con el mismo evaluador TAFA y las mismas Fechas; nunca por nombre o estadísticas secundarias. Si sigue empatado, vincular otra Fecha Liga posterior. La confirmación continúa bloqueada mientras el orden necesario no esté resuelto.
7. Con cuatro sobrevivientes, **Semifinales**: elegir tabla confirmada y Fecha destino; construir 1.º–4.º y 2.º–3.º. Bonus fijo +2 para primero y segundo, cero para los otros, reemplazando la escala de supervivencia. Usar el componente compartido para refrescar, resolver TAFA y confirmar ganadores.
8. **Final**: construir desde los dos ganadores confirmados, refrescar y confirmar. No hay tercer puesto. La pantalla muestra el campeón deportivo. La asignación completa de resultados/IFFHS pertenece al bloque de cierre documentado en RESULTS-IFFHS-DESIGN.md; no se eligen automáticamente destinatarios tras sustituciones.

## Endpoints

Nuevos (requieren Admin):

- `GET /api/admin/competition-engine/competitions/:id/duos`: elegibles, parejas e historial.
- `POST /api/admin/competition-engine/competitions/:id/duos/pairs`: `{pairs:[[userId,userId],...]}`; modo manual auditado.
- `POST /api/admin/competition-engine/round-links/:id/duos/tiebreak`: crea/reutiliza TAFA asociado a la tabla y congela puntos de origen, sin inventar cruces de supervivencia.

Reutilizados:

- `POST /api/admin/competition-engine/competitions/:id/duos/draw`
- `GET /api/competition-engine/entries/:id/duos/members`
- `POST /api/admin/competition-engine/entries/:id/duos/substitute`
- `GET /api/competition-engine/round-links/:id/duos/table`
- `PUT /api/admin/competition-engine/round-links/:id/duos/settings`
- `POST /api/admin/competition-engine/round-links/:id/duos/confirm`
- `POST /api/admin/competition-engine/round-links/:id/duos/semifinals`
- `POST /api/admin/competition-engine/stages/:id/duos/final`
- Knockout y TAFA compartidos para lectura, refresco y confirmación.

## Persistencia y compatibilidad

Migración `0014_duos_admin.sql`: origen/snapshot de puntos del desempate de tabla y `members_json` en snapshots de supervivencia. Aplicada únicamente en D1 local. No cambia puntuación 3/1/0 ni Liga legacy. Se conservan los bloqueos genéricos de knockout de las siete competiciones y todos los cambios remotos de `309435b`.

La sustitución también respeta el límite exclusivo en knockout. Los resultados de tabla confirmados son inmutables. Si los puntos originales cambian tras iniciar su desempate, el snapshot evita confirmar silenciosamente un orden basado en otros puntos; requiere revisión administrativa.

## Archivos

- UI: `src/AdminCupDuos.tsx`, `src/DuoPairs.tsx`, `src/DuoTable.tsx`; integración `src/AdminCompetitions.tsx`. Reutiliza `CupEncounter`, API y estilos compartidos.
- Backend: `worker/competition-duos.ts`, `worker/competition-tiebreak.ts`, `worker/competition-knockout.ts`.
- Migración: `migrations/0014_duos_admin.sql`.
- Pruebas: `tests/cup-duos-admin.test.ts` (SQLite real con todas las migraciones) y actualización de contrato TAFA.
- Reglas/guías: `AGENTS.md`, `COPA_DUOS_SPEC.md`, `ADMIN-COMPETICIONES.md`, este documento.

## Prueba local

URL: `http://127.0.0.1:5174/`. T34 **Prueba local Dúos manual** usa participantes ficticios, ocho parejas, dos Fechas de supervivencia y semifinal/final. T35 **Prueba local Dúos automática** permite revisar el sorteo opcional separado. La sustitución de prueba de Dúo 1 reemplaza Copa A Prueba 01 por Copa B Prueba 01 desde Supervivencia 2, conservando Supervivencia 1.

Las preparaciones SQL y scripts de datos ficticios permanecen ignorados bajo `.wrangler`; no incluyen datos productivos. No se hizo deploy, merge a main ni operación de D1 remota.
