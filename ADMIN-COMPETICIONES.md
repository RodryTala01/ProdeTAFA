# Admin de Competiciones

Bloque implementado en `dev/t32-competition-engine`: pantalla central, detalle y edición general sobre el backend existente. No agrega migraciones ni modifica reglas deportivas.

## Probar localmente

1. Abrir http://127.0.0.1:5174/ e ingresar con Admin local (`0000000001`, contraseña de prueba `Admin123!`).
2. Tocar **Competiciones**. Se elige la temporada activa; si no existe una activa, se muestra la más reciente y su estado real. El selector permite cambiar de temporada, utilizando IDs recibidos de la API.
3. La T32 de prueba local está en borrador, con nueve competiciones. Copa Papa figura como **Copa Miguel Ángel Russo**, tras verificar el cambio de nombre. No se activó la temporada ni se alteraron divisiones.
4. Tocar **Administrar** en cualquier tarjeta. El detalle muestra código estable, temporada, estado, etapas ordenadas y las Fechas asociadas a cada etapa cuando existen.
5. Cambiar el nombre visible y tocar **Guardar**. En Copa Papa, el código `COPA_PAPA` permanece igual. El estado también se modifica mediante este formulario, respetando los rechazos del backend.
6. En **Nueva etapa**, escribir un nombre y elegir uno de los cinco formatos disponibles. Tocar **Crear etapa**. Luego usar **Editar**, cambiar nombre/estado y **Guardar etapa**.
7. **Eliminar** pide confirmación. Está deshabilitado si la etapa muestra Fechas vinculadas; el backend también rechaza la eliminación si tiene grupos, cruces o desempates. No se omiten esas validaciones.
8. Los controles existentes de vincular/desvincular Fechas se conservan dentro del detalle. **Volver a competiciones** regresa a las tarjetas.
9. **Administrar temporada y divisiones** conserva las herramientas existentes en una sección plegable. La Liga legacy, LeagueView, Fechas, Participantes y pronósticos no fueron reemplazados.

Las etapas de la prueba automática se crearon, editaron y eliminaron; no quedaron etapas ficticias adicionales. Las nueve competiciones provienen de la plantilla del backend, no de tarjetas con IDs inventados.

## Endpoints reutilizados

Todos los siguientes usan el prefijo `/api/admin/competition-engine`:

- `GET /`: temporadas, divisiones, competiciones, etapas y vínculos. Este mismo payload alimenta lista y detalle; no hace falta otro GET de detalle.
- `PUT /competitions/:id`: nombre visible y estado, conservando código.
- `POST /competitions/:id/stages`: creación de etapa.
- `PUT /stages/:id`: edición del nombre y estado. No se envían ajustes deportivos ni se borra su configuración previa.
- `DELETE /stages/:id`: eliminación validada por backend.
- Se conservan `POST /seasons`, `PUT /seasons/:id/divisions`, `PUT /seasons/:id/status`, `POST /competitions/:id/rounds` y `DELETE /competitions/:id/rounds/:linkId`.

No faltó ningún endpoint para este bloque. Para el futuro armado manual de Copa Dúos falta un endpoint de carga inicial de parejas: el backend actual tiene sorteo y sustituciones. Debe implementarse en su bloque específico con elegibilidad, restricciones y auditoría, reutilizando la lógica existente. La regla manual/asistida se dejó explícita en AGENTS.md y COPA_DUOS_SPEC.md, complementando el diseño general y COPAS_SPEC.md.

## Validación

- 235 tests en 31 archivos, incluidos tests nuevos de renderizado y contratos ejecutados sobre SQLite con todas las migraciones.
- Tests nuevos: selección de temporada activa con IDs distintos de 32; entrada Admin y lista/detalle; cinco formatos controlados; orden de etapas y Fechas; renombrado de Copa Papa con auditoría; creación/edición/eliminación; rechazos por uso deportivo, temporada cerrada y rol participante.
- Prueba real de navegador Edge en viewport móvil de 390 × 844: nueve tarjetas, detalle, renombrado, creación/edición/eliminación de etapa, sin overflow horizontal ni errores JS.
- Build TypeScript + Vite correcto.
- D1 local actualizada con las migraciones existentes 0006–0013. No se agregó ninguna migración nueva.
- CI configurada para ejecutar migraciones locales, tests y build también en pushes a `dev/t32-competition-engine`.

## Archivos

- `src/AdminCompetitions.tsx`: tarjetas/detalle, temporada activa, carga/errores y herramientas existentes.
- `src/CompetitionConfigPanel.tsx`: cinco formatos, edición de etapas, vínculos visibles y estados legibles.
- `src/competition-presentation.ts`: etiquetas y selección inicial de temporada.
- `src/admin-competitions.css`: disposición responsive sin rediseñar la app.
- `tests/admin-competitions.test.ts`: pruebas de presentación y contrato real.
- `.github/workflows/build.yml`: CI en rama de desarrollo.
- `AGENTS.md`, `COPA_DUOS_SPEC.md`, este documento: alcance y regla de configuración manual/asistida.

Producción y D1 remota no fueron modificadas. No se ejecutó deploy ni merge a main.
