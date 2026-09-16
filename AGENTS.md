# ProdeTAFA — instrucciones para Codex

## Objetivo

Aplicación permanente de Prode para aproximadamente 40 participantes. Priorizar robustez, pocas intervenciones manuales y reglas de negocio explícitas. No inventar nuevas reglas ni ampliar fases sin actualizar este archivo.

## Arquitectura

- React + TypeScript + Vite.
- Cloudflare Vite Plugin.
- Un Cloudflare Worker para API + frontend estático.
- Cloudflare D1 como base SQL.
- Worker de entrada actual: `worker/entry.ts`, que envuelve el núcleo de `worker/index.ts`.
- API-Football detrás del backend; nunca exponer `FOOTBALL_API_KEY` al frontend.
- Fechas persistidas en UTC; mostrar en `America/Argentina/Buenos_Aires`.

## Participantes y acceso

- Roles: `admin` y `participant`.
- El admin crea participantes; no hay autorregistro.
- Login con teléfono normalizado + contraseña.
- Contraseñas nunca en texto plano.
- El participante podrá cambiar su propia contraseña.
- El admin puede resetear/asignar una nueva contraseña a un participante, pero nunca leer la contraseña actual ni modificar una cuenta admin desde el endpoint de participantes.
- Nombre y teléfono los administra exclusivamente el admin; el participante no los edita.
- Desactivar un participante bloquea acceso y elimina sesiones, pero conserva pronósticos, puntajes, rankings y temporadas históricas.
- Reactivar vuelve a habilitar login sin reescribir historia.
- Perfil individual avanzado queda para una fase posterior.
- Se desea agregar escudo/avatar de participante en una fase de pulido; el recurso será cargado más adelante por el admin.

## Fechas del Prode

- Una fecha tiene exactamente 12 partidos para poder publicarse.
- Puede mezclar competiciones reales.
- Sólo puede existir **una fecha `open` a la vez**. Para publicar otra, primero cerrar la actual.
- La lista de partidos sólo puede cambiar mientras la fecha esté `draft`.
- Una fecha `open` o `finished` es inmutable respecto de alta/baja de partidos, también en backend.
- El cierre de una fecha sigue siendo manual por parte del admin, aunque los 12 partidos estén definitivos.
- No eliminar fechas desde la aplicación normal; para fechas que no deban usarse, preferir estado archivado/cancelado preservando trazabilidad.
- Se desea clasificar fechas por contexto, al menos `Liga`, `Copa` y `Desempate`; la semántica exacta de Copa/Desempate debe definirse antes de implementar esas competiciones.
- El orden visible de partidos para participantes sigue siendo por hora de comienzo.

## Pronósticos

- Partido normal: marcador local/visitante.
- Autosave como borrador + botón explícito `Enviar pronóstico`.
- Todos los partidos todavía abiertos deben estar completos para enviar.
- Partidos ya cerrados no bloquean el envío del resto y quedan sin participación/puntos si no se pronosticaron.
- Después del primer envío, editar un pronóstico NO lo convierte automáticamente en una nueva presentación oficial: los cambios quedan pendientes hasta tocar `Reenviar`.
- Cierre individual: kickoff oficial + 1 minuto.
- Si el proveedor modifica kickoff antes del cierre, adaptar el cierre.
- Backend, no sólo UI, debe rechazar escrituras tardías.
- Mostrar hora exacta de cierre y cuenta regresiva por partido.
- No hace falta barra global `x/12` por ahora.
- No pedir confirmación previa al envío ni advertencias por marcadores altos por ahora.
- Después de enviar, mostrar una confirmación visible con la hora del último envío.
- El texto visible para la selección extra será simplemente `Penales`.

### Navegación rápida de inputs

- En partido `NORMAL`: `Local → Visitante → Local del siguiente partido editable`.
- En `PENALTIES_ONLY`: `Local → Visitante → Penales → Local del siguiente partido editable`.
- Con un dígito válido, avanzar automáticamente al siguiente control.
- Saltar partidos/controles bloqueados o deshabilitados.
- En el último control no producir errores si no existe siguiente foco.
- Priorizar buen funcionamiento con teclado numérico móvil.

### Historial y trazabilidad de pronósticos

- No auditar cada tecla/cambio de borrador antes del primer envío; el autosave no debe generar ruido histórico.
- Al primer envío, registrar fecha/hora y el estado presentado.
- Registrar cambios oficiales únicamente al Reenviar, comparando la versión oficial anterior con la nueva; nunca auditar autosaves como modificaciones oficiales.
- Registrar por separado cada `Reenviar`.
- No crear evento si el valor guardado es idéntico al anterior.
- Incluir cambios de marcador y de selección de `Penales`.
- El historial debe ser append-only desde el flujo normal.
- El admin puede consultar historial por fecha y participante, y también desde el participante.
- Cada participante puede consultar su propio historial, pero no el de otros mientras la fecha está abierta.
- Filtros deseados para admin: fecha, participante y tipo de evento.
- No se requiere por ahora snapshot completo/versionado de los 12 partidos por cada reenvío si el historial de cambios permite reconstruir qué ocurrió.
- Mostrar timestamps en `America/Argentina/Buenos_Aires` aunque se persistan en UTC.
- En Admin debe ser fácil identificar quién todavía no presentó una fecha, aunque el dashboard estadístico avanzado quede para después.

## Partido marcado para penales (`PENALTIES_ONLY`)

El nombre interno se conserva por compatibilidad. **No significa que el partido necesariamente vaya a penales.** Significa que, además del marcador de 90 minutos, el participante pronostica qué equipo ganaría la tanda si efectivamente ocurre.

- Marcador de 90 minutos: puntúa 3/1/0 normal.
- Elección de ganador de tanda: +1 sólo si el partido realmente llega a penales y la elección es correcta.
- Si no hay tanda, la elección extra vale 0 y no penaliza.
- Un pleno puede valer 4 si además acierta la tanda.
- No usar la sintaxis histórica de asteriscos.
- Al corregir manualmente el resultado, el admin debe indicar explícitamente si **realmente hubo penales**. No inferirlo del `match_type`.

## Puntuación

- Pleno de 90’: 3 puntos totales.
- Signo correcto con marcador incorrecto: 1 punto total.
- Error: 0.
- El pleno no suma además el parcial.
- Partido anulado/void: 0 y no cuenta como error.
- Los scores pueden ser provisionales durante un partido si el proveedor aporta datos fiables.
- El cálculo debe ser idempotente.
- Si un partido deja de ser scorable (por ejemplo al quitar una corrección manual mientras espera la resincronización oficial), eliminar scores derivados viejos; no mostrar puntaje obsoleto.

## Resultados y correcciones

- Sincronizar automáticamente con API-Football y permitir actualización manual desde Admin.
- API-Football Free: no usar `ids`; consultar `/fixtures?date=YYYY-MM-DD&timezone=America/Argentina/Buenos_Aires` y filtrar localmente por fixture ID.
- Cron actual cada 10 minutos; consultar sólo días relevantes para no exceder cuota.
- El admin puede corregir resultados manualmente con motivo obligatorio y auditoría.
- Mientras una corrección manual esté activa, la API no debe pisarla.
- `Volver a API-Football` deja el partido pendiente, limpia resultado/puntos derivados viejos y espera próxima sincronización oficial.
- El admin también puede editar excepcionalmente un pronóstico con motivo/auditoría.

## Ranking de fecha

Orden:

1. puntos totales;
2. más plenos;
3. más parciales;
4. menos errores;
5. más extras;
6. orden alfabético determinístico.

- Admin puede ver ranking en vivo.
- En Admin, diferenciar visualmente puntos provisionales de puntos definitivos.
- Participante sólo ve ranking final cuando la fecha está `finished`.
- Después de finalizar, revelar los pronósticos enviados de todos los participantes.
- Participantes inactivos no desaparecen de rankings históricos.

## Fase 2 — Liga

### Temporada

- El admin crea una temporada y luego vincula fechas.
- Exactamente 5 fechas por Liga.
- Slots 1–5 según orden de vínculo.
- Una fecha no puede pertenecer a dos Ligas.
- Una Liga sólo se finaliza cuando tiene las 5 fechas y las 5 están cerradas.
- Liga finalizada queda histórica e inmutable.

### Participantes y altas tardías

- Al crear la Liga entran los participantes activos con `eligible_from_slot = 1`.
- Un no-presentado suma 0 en esa fecha.
- Se permite crear/reactivar participantes durante una Liga.
- `eligible_from_slot` define desde qué fecha pueden sumar:
  - si existe una fecha vinculada todavía no finalizada, usar el primer slot no finalizado;
  - si todas las vinculadas ya terminaron, usar `cantidad vinculada + 1` (puede ser 6 si la Liga ya consumió sus cinco fechas).
- Nunca otorgar puntos retroactivos de slots anteriores, aunque existieran pronósticos históricos para esas fechas.
- Si se desvincula una fecha y se reindexan slots, reindexar también `eligible_from_slot` cuando corresponda.
- Desactivar después no borra historia de Liga.

### Tabla de Liga

Acumular sólo cuando:

- el participante presentó esa fecha (`round_submissions`);
- el partido está finalizado/void;
- el score no es provisional;
- el slot de la fecha es `>= eligible_from_slot` del participante.

Usar los mismos desempates que el ranking de fecha. La tabla se refresca periódicamente desde D1 y puede cambiar al finalizar cada partido; nunca usar puntos provisionales.

Mejoras deseadas:

- Al tocar un participante, mostrar desglose de puntos por Fecha 1–5.
- Mostrar movimiento de posición (`↑N`, `↓N`) cuando la posición cambie; definir técnicamente el punto de comparación antes de implementar para que sea determinístico.

### Navegación

Participante: `Pronósticos | Liga | Historial`.

Administrador: `Fechas | Liga | Participantes`.

En móvil, navegación inferior fija y respeto de safe areas. La PWA debe sentirse como app instalada (`standalone`).

## Historial del participante

La vista histórica debe ser lo más completa posible. Al abrir una fecha finalizada, mostrar como mínimo:

- posición conseguida;
- puntos;
- plenos;
- parciales;
- errores;
- extras;
- sus 12 pronósticos;
- resultado real de cada partido;
- puntos obtenidos por partido.

El perfil estadístico transversal del participante queda para una fase posterior.

## Avisos internos

Antes de integrar WhatsApp o push, se permiten avisos internos útiles dentro de la app, por ejemplo indicar que todavía quedan partidos sin completar o que una acción requiere atención.

No convertir todavía esto en un sistema complejo de notificaciones externas.

## Dashboard Admin

Se desea una pantalla inicial de Admin simple y operativa con información útil de la fecha activa, Liga actual y estado general. Las estadísticas avanzadas y métricas agregadas quedan para una fase posterior.

No implementar por ahora duplicación de fechas.

## Copas — siguiente gran fase funcional

Las Copas NO son simplemente una fase posterior desconectada de Liga: el calendario real alterna jornadas de Copa y Liga.

Patrón conceptual indicado por el usuario:

`Fecha 32avos Copas → Fecha 1 Liga → Fecha Copas → Fecha 2 Liga → Fecha Copas → Fecha 3 Liga → ...`

- Hay múltiples Copas.
- Debe existir categoría/identidad de fecha de Copa.
- También existe el concepto de `Desempate`, cuya regla exacta debe definirse.
- No implementar todavía estructura de Copas hasta confirmar formato, clasificación, cruces, cantidad de copas, avance y desempates.
- La Liga ya implementada debe seguir funcionando aunque haya fechas de Copa intercaladas en el calendario general.

## Diseño, PWA y Android

- Primero garantizar funcionamiento y reglas.
- Después realizar pulido/rediseño visual antes de empaquetar Android.
- Identidad visual definitiva (colores/branding TAFA) se definirá más adelante.
- No implementar modo oscuro por ahora; puede evaluarse después.
- La APK/AAB queda hacia el final, una vez cerradas funcionalidad y diseño.

## Seguridad y consistencia

- Toda autorización sensible en backend.
- Cookie de sesión HttpOnly, Secure en HTTPS y SameSite=Lax.
- Mutaciones `/api/*` deben rechazar requests cross-site sin romper requests legítimos sin `Origin` (CLI/Codex).
- SQL parametrizado.
- Nunca almacenar secretos reales en Git.
- Nunca almacenar contraseñas recuperables o visibles para el admin; usar hash y reset seguro.
- Health profundo debe detectar esquema de Liga incompleto y más de una fecha abierta.
- CI debe aplicar todas las migraciones D1 locales antes de tests/build.

## Estado de migraciones

- `0001_initial.sql`: núcleo del Prode.
- `0002_league_seasons.sql`: temporadas, fechas de Liga y participantes.
- `0003_league_entry_slot.sql`: `league_participants.eligible_from_slot` para altas tardías sin retroactividad.
- `0004_prediction_history.sql`: auditoría anterior, conservada como legado sin convertir sus cambios de borrador en eventos oficiales.
- `0005_official_predictions.sql`: separación de borradores y oficiales; publicación y auditoría oficial atómicas. Scoring y revelado consumen sólo official_predictions. Los partidos bloqueados conservan su versión oficial previa. Las correcciones Admin son explícitas, con motivo y auditoría.

## Regla de avance

Orden funcional acordado a partir de septiembre de 2026:

1. cerrar mejoras de pronósticos, historial y trazabilidad;
2. validar y pulir Liga;
3. definir e implementar Copas y Desempates, respetando que se intercalan con fechas de Liga;
4. completar historial/estadísticas avanzadas y perfiles;
5. pulir/rediseñar UI;
6. cerrar PWA;
7. generar APK/AAB al final.

Si una regla futura es ambigua, no inventar una extensión grande: mantener el comportamiento más conservador, documentarlo y preservar compatibilidad con estas reglas.
