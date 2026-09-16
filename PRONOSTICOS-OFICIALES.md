# Pronósticos oficiales — validación local

Validado el 16/09/2026. URL: http://127.0.0.1:5174/

## Arquitectura

- `predictions` conserva el borrador editable; su autosave no altera puntos ni historial oficial.
- `official_predictions` conserva la última presentación oficial por participante y partido. Scoring, ranking, Liga y revelado consultan esta tabla.
- `round_submissions` conserva el estado de presentación, contador y hora del último envío.
- Los triggers de D1 validan y publican el borrador dentro de la misma transacción del envío. Sólo reemplazan partidos todavía editables; conservan los oficiales bloqueados.
- `prediction_submission_events` registra FIRST_SUBMISSION, PREDICTION_CHANGE y RESUBMISSION, con valores, campos modificados y snapshots. Los eventos no se actualizan ni eliminan desde la aplicación. Las correcciones Admin mantienen su motivo y auditoría.
- Los timestamps se persisten en UTC y se muestran en America/Argentina/Buenos_Aires.
- La autorización se comprueba en backend. El participante sólo consulta su propio historial; Admin puede consultar todos.

## Migraciones y seguridad

`0001` a `0005` aplicadas únicamente en D1 local. La nueva migración es `0005_official_predictions.sql`; `0004_prediction_history.sql` conserva la auditoría anterior como legado.

La migración recupera el último snapshot enviado cuando existe. Para presentaciones anteriores sin snapshot conserva una base de compatibilidad marcada `legacy_baseline`: no puede reconstruir una versión histórica inexistente. Los cambios de borrador del historial antiguo no se importan como modificaciones oficiales.

`wrangler.jsonc` contiene `remote: false`. Vite usa D1 emulada y persistida bajo `.wrangler/state/v3`. El respaldo previo está en `.wrangler/before-official-0005.sql`, fuera de Git. No se consultaron ni modificaron datos de D1 remota y no se ejecutó deploy.

## Datos y credenciales exclusivos de prueba local

| Cuenta | Teléfono | Contraseña |
| --- | --- | --- |
| Admin Prueba Local | 0000000001 | Admin123! |
| Carlos Prueba — para primer envío | 0000000102 | Prueba123! |
| Auditoria Prueba Local — demostración ya enviada | 0000000201 | Prueba123! |

La fecha `LOCAL E2E - Fecha 1` está abierta. Tiene 12 partidos ficticios, 10 normales y 2 con Penales; las fechas 2–5 siguen en borrador. Los horarios son futuros respecto de esta validación.

Para poder demostrar puntos sin esperar al kickoff, el partido `Local 01 vs Visitante 01` tiene un resultado manual local de **1–0**, con motivo de prueba. Los otros resultados siguen pendientes. Esta preparación artificial no cambia las reglas de bloqueo del producto.

La cuenta Auditoria ya tiene dos envíos: pasó de 1–0 a 2–0 en ese partido, de 3 a 1 punto, con los tres eventos correspondientes. Carlos está disponible para repetir el flujo desde el primer envío.

## Pasos visuales exactos

1. Abrir la URL y, si aparece Admin, tocar **Salir**. Ingresar como Carlos.
2. En **Pronósticos**, abrir `LOCAL E2E - Fecha 1`. Completar todos los marcadores con **1–0**, salvo los dos partidos con Penales, que pueden llevar **1–1** y selección del equipo local. El autosave debe decir Guardado y no generar eventos oficiales. Antes del envío: **0 puntos**.
3. Comprobar el foco: en normales, Local → Visitante → Local del siguiente partido; en los últimos dos, Local → Visitante → Penales → siguiente partido. Verificar que cada tarjeta muestre cierre y cuenta regresiva.
4. Tocar **Enviar pronóstico**. Debe aparecer **Pronóstico enviado · HH:MM**, un envío y **3 puntos** por Local 01 vs Visitante 01.
5. Cambiar sólo Local 01 a **2** y esperar **Guardado**, sin tocar Reenviar. Los puntos siguen en **3**. Al recargar, el borrador sigue 2–0, pero la presentación oficial sigue 1–0. En el historial todavía hay únicamente Primer envío.
6. Tocar **Reenviar**. Deben aparecer **1 punto**, dos envíos y la hora actualizada. El historial agrega **Modificación: 1–0 → 2–0** y **Reenvío**.
7. Para consultar el historial propio, tocar **Historial → Mi historial de pronósticos → Fecha del Prode → LOCAL E2E - Fecha 1**. También está disponible al pie de Pronósticos. Usar **Actualizar historial** si ya estaba abierto durante el envío.
8. Salir e ingresar como Admin. En **Fechas**, abrir `LOCAL E2E - Fecha 1`, desplegar **Historial de pronóstico** y elegir **Carlos Prueba**. Filtrar por Primer envío, Modificación o Reenvío. La lista de participantes indica quién envió y quién no, y la última hora de presentación.
9. Probar el segundo acceso: **Participantes → Carlos Prueba → Historial → elegir LOCAL E2E - Fecha 1**. Debe mostrar los mismos eventos.
10. Como participante, cambiar la selección de Penales en el partido 11 y guardar: no aparece un evento nuevo hasta Reenviar. Al reenviar, el historial muestra los nombres de los equipos anterior/nuevo. Como esos resultados siguen pendientes, este cambio no agrega puntos todavía.
11. Reenviar sin cambiar nada agrega un evento Reenvío, pero ninguna Modificación.

No es necesario ejecutar comandos ni sincronizar con API-Football para esta prueba. Cuando se supere el cierre real de los fixtures locales, sus inputs quedarán bloqueados como corresponde.

## Validación realizada

- 81 tests aprobados en 11 archivos, incluyendo los 14 casos solicitados, auditoría inmutable, migración, ranking/revelado oficial, concurrencia de recálculo y navegación de foco.
- `npm run build`: correcto (TypeScript, Worker y frontend).
- Flujo real por API local: borrador 0 → primer envío 3 → edición pendiente 3 → reenvío 1; historial Admin y participante coincidentes.
- Historial Admin verificado visualmente en navegador. La interacción táctil/teclado en un teléfono físico queda pendiente de prueba manual; la secuencia de foco tiene tests automatizados.
- Commit base `f07b37c0814d00fcfd9d3340ae803d2b6ce1b373`, alineado con `origin/main`; cambios de trabajo conservados sin commit ni push.

## Archivos del cambio y preparación local

Backend: `worker/predictions.ts`, `worker/prediction-history.ts`, `worker/scoring.ts`, `worker/ranking.ts`, `worker/league.ts`, `worker/history.ts`, `worker/standings.ts`, `worker/admin-corrections.ts`, `worker/entry.ts`.

Frontend: `src/ParticipantRound.tsx`, `src/PredictionHistory.tsx`, `src/PredictionHistoryBrowser.tsx`, `src/prediction-focus.ts`, `src/prediction-history.css`, `src/AdminRounds.tsx`, `src/AppV2.tsx`.

Migraciones: `migrations/0004_prediction_history.sql` (trabajo previo conservado), `migrations/0005_official_predictions.sql` (separación oficial nueva).

Tests: `tests/official-predictions.test.ts`, `tests/prediction-history.test.ts`, `tests/prediction-focus.test.ts`.

Configuración/documentación y preparación: `wrangler.jsonc`, `package-lock.json`, `AGENTS.md`, `ROADMAP.md`, `README.md`, `PRUEBA-LOCAL.md`, `PRONOSTICOS-OFICIALES.md`, `scripts/seed-local.mjs`, `scripts/recalculate-local.mjs`, `scripts/verify-official-local.mjs`.

El build también genera `tsconfig.app.tsbuildinfo` y `tsconfig.worker.tsbuildinfo`; son artefactos locales, no cambios funcionales.
