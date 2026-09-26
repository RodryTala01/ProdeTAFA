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


# Administración deportiva Copa A/B

Este bloque agrega sólo Copa A/B Admin sobre la pantalla existente. Conserva Liga legacy, pronósticos, las otras Copas y la configuración general. No necesita migración nueva.

## Flujo visual

1. Abrir http://127.0.0.1:5174/ y entrar con Admin local: teléfono `0000000001`, contraseña de prueba `Admin123!`.
2. Entrar a **Competiciones**, elegir **T33 · Prueba local Copa A/B**, y tocar **Administrar Copa A** o **Administrar Copa B**. Esta temporada es ficticia y sólo existe en D1 local; no es una temporada de producción.
3. **Resumen** muestra la división, elegibles, etapas y dos Fechas de grupos. **Grupos** muestra ranking IFFHS, bombos, campeón A1, configuración y tablas con destinos. La referencia IFFHS local no tiene temporadas históricas importadas: se informa explícitamente.
4. Para una edición todavía sin Fechas vinculadas: elegir **Armar manualmente**, asignar todos los elegibles una vez y **Guardar grupos manuales**. Se pueden ajustar cantidad de grupos y plazas; el backend valida división, duplicados, faltantes y campeón A1. Los bombos no imponen restricciones manuales adicionales. Sin campeón histórico, se puede registrar una designación administrativa auditada.
5. Como alternativa, **Sorteo automático** muestra elegibles, IFFHS, grupos y campeón antes de **Ejecutar sorteo de grupos**. Guarda semilla, orden de referencia y resultado en auditoría. El campeón elegible queda A1 en ambas Copas.
6. Abrir **Configuración general, etapas y Fechas** para crear etapas y vincular las Fechas existentes. El orden de las etapas KNOCKOUT es Octavos, Cuartos, Semifinal, Final. Los vínculos de Copa no incorporan automáticamente sus puntos a Liga. Los grupos dejan de ser editables al vincular Fechas; las tablas son provisionales hasta completar exactamente dos Fechas cerradas.
7. **Octavos**: elegir la Fecha vinculada y tocar **Consultar clasificados para Octavos**. El backend devuelve segundos y terceros. **Armar cruces manualmente** permite elegir segundo contra tercero; **Guardar cruces manuales** exige usar todos una vez. También existe **Sortear automáticamente**. Para reemplazar cruces en borrador, indicar **Motivo de corrección**. Publicación/inicio o actividad deportiva bloquean el reemplazo.
8. **Actualizar puntajes** consulta el motor existente. Si hay ganador calculado, tocar **Confirmar ganador**. Si hay igualdad, aparece **Desempate pendiente**: entrar a **Administrar desempate TAFA**, vincular una Fecha posterior y **Evaluar y confirmar desempate**. El desempate conserva las reglas por día/partido del motor, sin criterios de Liga. Una corrección excepcional del ganador exige motivo y auditoría.
9. **Cuartos** usa primeros de grupo más ganadores confirmados de Octavos. **Semifinal** usa ganadores confirmados de Cuartos. Ambos tienen modos manual y automático, con validación backend de todo el pool. **Final** utiliza los dos ganadores confirmados de Semifinal. No hay tercer puesto.

## Escenario local preparado

- T33: 16 participantes ficticios de División A y 16 de División B.
- Grupos A guardados manualmente y grupos B por sorteo automático, ambos auditados.
- Dos Fechas de grupos ficticias cerradas, con 12 partidos anulados por Fecha: tablas finales en cero para ejercitar clasificación determinística sin datos reales.
- Octavos A manuales y Octavos B automáticos: cuatro cruces por Copa, con Fecha futura en borrador. Se pueden consultar y corregir con motivo.
- Cuartos, Semifinal y Final tienen etapas y Fechas futuras en borrador vinculadas, pero no cruces: requieren confirmar ganadores de las fases anteriores.
- Hay una Fecha ficticia de Desempate disponible. No se publicó ninguna de estas Fechas ni se activó T33.
- La T32 conserva sus participantes previos y su vínculo de Fecha existente. Se agregaron las etapas eliminatorias para acceder al nuevo flujo, sin publicar ni finalizar su actividad.

## Endpoints

Prefijo Admin: `/api/admin/competition-engine`.

Reutilizados: `GET /api/competition-engine/iffhs/ranking`, `GET /api/competition-engine/cups/:code/groups?season=:number`, `GET /api/competition-engine/stages/:id/knockout`, confirmación `PUT /encounters/:id/winner`, y creación/vinculación/evaluación de desempates mediante `POST /encounters/:id/tiebreak`, `POST /tiebreaks/:id/rounds`, `POST /tiebreaks/:id/refresh`. Se conservan creación de etapas y vínculos de Fechas del Admin anterior.

Ampliados:

- `GET /stages/:id/groups`: nuevo contexto Admin con elegibles, campeón previo elegible, asignaciones y última configuración auditada.
- `POST /stages/:id/groups`: grupos manuales, campeón A1 y auditoría con modo MANUAL. Reemplazo de grupos y auditoría en el mismo batch.
- `POST /stages/:id/groups/draw`: conserva sorteo por bombos y semilla, reutiliza persistencia/validaciones de grupos.
- `GET /stages/:id/cup-ab-progression/{r16|quarterfinals|semifinals|final}`: vista previa de clasificados para un destino y Fecha vinculada.
- `POST` a esas rutas: acepta `mode: MANUAL` y `pairs: [[entryAId,entryBId],...]`; omitir modo conserva automático. `replace: true` requiere motivo y sólo es válido antes de publicar/iniciar. Manual no registra randomSeed.
- `PUT /stages/:id/knockout` remite Copa A/B al endpoint de avance para impedir eludir elegibilidad y la restricción segundo-tercero.
- Confirmación de ganador A/B exige motivo para excepción Admin y usa un batch con auditoría. Antes de avanzar se recalculan los cruces origen; una corrección que cambie al ganador invalida su confirmación anterior.
- El desempate permite consultar de nuevo una instancia ya resuelta y corrige una columna SQL ambigua al vincular la Fecha.

## Archivos de este bloque

UI: `src/AdminCupAb.tsx`, `src/CupAbKnockout.tsx`, `src/cup-ab-api.ts`, `src/cup-ab.css`, integración en `src/AdminCompetitions.tsx`.
Backend: `worker/cup-ab-context.ts`, `worker/competition-groups.ts`, `worker/competition-draw.ts`, `worker/competition-cup-ab-progression.ts`, `worker/competition-knockout.ts`, `worker/competition-tiebreak.ts`.
Pruebas: `tests/cup-ab-admin.test.ts` y adaptación del contrato de auditoría en `tests/competition-draw-contract.test.ts`. Reglas y guía: `AGENTS.md`, `COPAS_SPEC.md`, este archivo.

## Validación de Copa A/B

22 tests nuevos con SQLite y todas las migraciones: elegibilidad A/B, rol Admin, grupos manuales/duplicados/faltantes/división incorrecta, campeón A1 histórico, sorteo y auditoría, R16 válido y rechazos, exactitud de pool de Cuartos/Semifinal/Final, confirmación obligatoria e invalidación por corrección, bloqueo tras publicación, empate TAFA, motivo excepcional y sorteos automáticos de fases posteriores.

Navegador Edge real a 390 × 844: grupos manuales A, sorteo B, tablas, tabs de fases, octavos manuales A y automáticos B, participantes correctos, cuatro cruces por Copa, sin overflow horizontal ni errores JavaScript. El desplazamiento horizontal de las tablas está contenido dentro de cada tabla.

Todas las preparaciones usan D1 local y participantes/fixtures ficticios. No se ejecutó deploy, merge a main ni acceso a D1 remota.
`npm test`: 257 tests correctos en 32 archivos. `npm run build`: correcto. Las migraciones locales existentes están aplicadas; no se agregó ninguna migración.

## Administración de Copa Total

Implementada en el bloque siguiente sin rehacer Copa A/B. Ver [guía completa de Copa Total](ADMIN-COPA-TOTAL.md) para flujos, preparación local, archivos y endpoints.

## Administración de Copa Dúos

Ver [guía de Copa Dúos](ADMIN-COPA-DUOS.md): parejas manuales/automáticas, sustituciones, supervivencia, TAFA, semifinales y final.
