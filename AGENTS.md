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
- El admin puede resetear la contraseña de un participante, pero el endpoint de participantes jamás debe modificar una cuenta admin.
- Desactivar un participante bloquea acceso y elimina sesiones, pero conserva pronósticos, puntajes, rankings y temporadas históricas.
- Reactivar vuelve a habilitar login sin reescribir historia.

## Fechas del Prode

- Una fecha tiene exactamente 12 partidos para poder publicarse.
- Puede mezclar competiciones reales.
- Sólo puede existir **una fecha `open` a la vez**. Para publicar otra, primero cerrar la actual.
- La lista de partidos sólo puede cambiar mientras la fecha esté `draft`.
- Una fecha `open` o `finished` es inmutable respecto de alta/baja de partidos, también en backend.

## Pronósticos

- Partido normal: marcador local/visitante.
- Autosave como borrador + botón explícito `Enviar pronóstico`.
- Todos los partidos todavía abiertos deben estar completos para enviar.
- Partidos ya cerrados no bloquean el envío del resto y quedan sin participación/puntos si no se pronosticaron.
- Tras enviar se puede seguir editando cualquier partido todavía abierto.
- Cierre individual: kickoff oficial + 1 minuto.
- Si el proveedor modifica kickoff antes del cierre, adaptar el cierre.
- Backend, no sólo UI, debe rechazar escrituras tardías.

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
- Participante sólo ve ranking final cuando la fecha está `finished`.
- Después de finalizar, revelar los pronósticos enviados de todos los participantes.
- Participantes inactivos no desaparecen de rankings históricos.

## Fase 2 — Liga

Esta fase es exclusivamente Liga. No implementar todavía Copas, tabla histórica general, palmarés, perfiles avanzados, estadísticas divertidas, WhatsApp o push.

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

### Navegación

Participante: `Pronósticos | Liga | Historial`.

Administrador: `Fechas | Liga | Participantes`.

En móvil, navegación inferior fija y respeto de safe areas. La PWA debe sentirse como app instalada (`standalone`).

## Seguridad y consistencia

- Toda autorización sensible en backend.
- Cookie de sesión HttpOnly, Secure en HTTPS y SameSite=Lax.
- Mutaciones `/api/*` deben rechazar requests cross-site sin romper requests legítimos sin `Origin` (CLI/Codex).
- SQL parametrizado.
- Nunca almacenar secretos reales en Git.
- Health profundo debe detectar esquema de Liga incompleto y más de una fecha abierta.
- CI debe aplicar todas las migraciones D1 locales antes de tests/build.

## Estado de migraciones

- `0001_initial.sql`: núcleo del Prode.
- `0002_league_seasons.sql`: temporadas, fechas de Liga y participantes.
- `0003_league_entry_slot.sql`: `league_participants.eligible_from_slot` para altas tardías sin retroactividad.

## Regla de avance

Antes de empezar Copas, validar en producción el ciclo completo:

`crear Liga → vincular 5 fechas → pronosticar → sincronizar resultados → sumar sólo definitivos → alta tardía sin retroactividad → cerrar fechas → cerrar Liga`.

Si una regla futura es ambigua, no inventar una extensión grande: mantener el comportamiento más conservador, documentarlo y preservar compatibilidad con estas reglas.
