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
- Etapa 3: mostrar contador global `x/12` sin barra. Contar borradores editables y oficiales cerrados; los cerrados incompletos no bloquean el envío de los abiertos.
- Primer envío directo, sin modal ni advertencias por marcadores altos. Al reenviar cambios, confirmar una comparación contra `officialPrediction` con Antes/Ahora y Penales; cancelar no publica.
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

- Nuevos partidos: Promiedos (cliente aislado, X-VER descubierto desde recursos públicos ante fallo y un solo reintento). API-Football se conserva para partidos legacy.
- Promiedos: horarios Buenos Aires convertidos explícitamente a UTC; resultado reglamentario desde etapa de 90 minutos. Ante datos ambiguos conservar estado y solicitar revisión.
- Correcciones manuales conservan provider; auditoría existente registra activación/reset de forma atómica, sin migración.
- Citar Promiedos en pantallas de fixtures/resultados.
- API-Football Free: no usar `ids`; consultar `/fixtures?date=YYYY-MM-DD&timezone=America/Argentina/Buenos_Aires` y filtrar localmente por fixture ID.
- Cron actual cada 10 minutos; consultar sólo días relevantes para no exceder cuota.
- El admin puede corregir resultados manualmente con motivo obligatorio y auditoría.
- Mientras una corrección manual esté activa, la API no debe pisarla.
- `Volver al proveedor` deja el partido pendiente, limpia resultado/puntos derivados viejos y espera próxima sincronización oficial.
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

Participante: `Inicio | Pronósticos | Competiciones | Mi Club`. Inicio es la pantalla posterior al login. Liga se consulta dentro de Competiciones e Historial desde Mi Club y Pronósticos; conservar las implementaciones existentes.

Administrador: `Fechas | Competiciones | Participantes`. Inicia en Fechas. Liga A/B dentro de Competiciones; conservar acceso identificado a la administración de Liga anterior.

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

La rama `dev/t32-competition-engine` ya contiene el backend deportivo del motor nuevo. Copa A/B Admin está terminada. Copa Total Admin está terminada. Copa Dúos Admin está terminada. Copa Campeones Admin está terminada. Copa Papa Admin está terminada. Promoción Admin utiliza la pantalla central y el backend existente, preservando las Copas y Liga legacy.

### Armado manual y asistido

- Toda pantalla futura de configuración debe ofrecer modalidad asistida/automática y modalidad manual.
- Elegibilidad, bombos, cabezas de serie y restricciones sirven para validar y sugerir; no obligan a sortear dentro de la app.
- Admin puede cargar grupos, parejas, cruces y posiciones en llave resultantes de un sorteo externo.
- Toda asignación manual debe validar elegibilidad y restricciones obligatorias y quedar auditada.
- Copa Dúos también debe permitir cargar parejas sorteadas fuera de la app; el sorteo interno es opcional.
- Copa A/B Admin ofrece Resumen, Grupos, Octavos, Cuartos, Semifinal y Final. Copa Total tiene su administración específica; Copa Dúos ofrece Resumen, Parejas, Fechas, Tabla, Semifinales y Final; las demás pantallas deportivas quedan para bloques posteriores. No duplicar el motor.
- En Copa A y Copa B, el campeón vigente elegible ocupa A1. Grupos manuales como primera opción; bombos IFFHS de referencia y sorteo opcional.
- Octavos valida en backend segundos contra terceros, todos una vez. Cuartos usa primeros de grupo y ganadores confirmados de Octavos; Semifinal y Final usan ganadores confirmados.
- Copa A/B no tiene tercer puesto. Cruces editables antes de publicación/inicio, con motivo y auditoría al corregir. El modo manual no guarda randomSeed.

### Copa Total Admin

- Elegibles: participantes activos pertenecientes a las divisiones de la temporada, tanto A como B.
- Grupos manuales como primera opción, entre 3 y 5 integrantes, todos exactamente una vez. No imponer restricciones adicionales al armado manual.
- Sorteo opcional por bombos IFFHS de la temporada previa; campeón Total vigente elegible en A1. Guardar semilla y resultado auditado.
- Exactamente dos Fechas de 12 partidos; seis mini-fechas de cuatro match_id persistidos. Fixture doble para grupos de 3/4, simple para 5 con sexta mini-fecha libre.
- Tablas deportivas PTS/DG/GF/PG: igualdad completa conserva posición compartida. No decidir clasificados por nombre.
- Clasificación configurable con vista previa, comodines y resolución manual de cortes empatados; selección excepcional completa con motivo y snapshot auditado.
- Octavos, Cuartos y Semifinal admiten cruces manuales o automáticos, usando todos los clasificados/ganadores confirmados una vez. Final usa dos ganadores de Semifinal; tercer puesto usa dos perdedores confirmados y vínculo independiente.
- Reutilizar knockout y desempate TAFA; edición bloqueada tras publicación/inicio o actividad. Cambios manuales auditados. No agregar UI de otras Copas ni de participante en este bloque.

### Copa Dúos Admin

- Parejas manuales como primera opción, sorteo opcional con semilla auditada. Todos los elegibles activos A/B exactamente una vez, dos por dúo. Cantidad impar requiere resolución Admin.
- Sustitución excepcional con vigencia desde la Fecha elegida (límite superior exclusivo), sin modificar snapshots pasados ni superponer integrantes.
- Tabla por Fecha: suma de los dos integrantes, ausencias 0, más bonus explícito; no acumular puntos deportivos anteriores.
- Eliminación y bonus por posición configurables; confirmar únicamente resultados definitivos, sin cortes empatados ni puestos de semifinales ambiguos. Snapshot de integrantes/puntos, eliminación, bonus y auditoría en un batch.
- Empates múltiples: comparar todos en la misma Fecha Liga posterior con el evaluador TAFA existente, nunca usar plenos/parciales/nombres como criterio deportivo.
- Con cuatro clasificados: semifinales fijas 1.º–4.º y 2.º–3.º, +2 sólo para primero y segundo. Final de ganadores confirmados, sin tercer puesto.
- La confirmación deportiva no asigna automáticamente IFFHS; respetar la confirmación explícita de resultados y destinatarios tras sustituciones definida en RESULTS-IFFHS-DESIGN.md.

### Copa Campeones Admin

- Propuesta de 14 cupos desde la temporada anterior; mostrar propuesto y confirmado por separado. Vacantes y duplicados requieren decisión manual y motivo, nunca reemplazo automático.
- Confirmar 14 personas únicas activas de la temporada antes de inicializar la llave fija de 13 nodos del backend. No convertirla en una llave de 16.
- Ramas superior, inferior y final. Activar cada nodo únicamente con ambas fuentes confirmadas, eligiendo etapa eliminatoria y Fecha vinculada.
- Reutilizar CupEncounter y TAFA. Sin tercer puesto ni correcciones genéricas que salteen las fuentes. Cupos bloqueados tras inicializar la llave; mutaciones bloqueadas en competición/temporada cerrada.

### Copa Papa Admin

- Mantener COPA_PAPA y editar display_name para el homenaje desde Configuración general.
- Propuesta espejo de temporada anterior: mejor Liga A vs peor Liga B, con no emparejados y byes de referencia visibles. Manual primero, todos los activos A/B exactamente una vez; rival null representa bye.
- Corrección de llave inicial mediante su endpoint específico, con motivo, snapshot anterior y auditoría. Sólo antes de publicación/inicio/actividad o avance; conservar etapa y Fecha originales.
- Progresión secuencial de ganadores confirmados, sin nuevos sorteos ni reconstrucción por knockout genérico. Final desde dos ganadores; tercer puesto desde exactamente dos perdedores de semifinales, con etapa/vínculo independiente.
- Reutilizar CupEncounter para puntajes, ganadores y TAFA. Bloquear mutaciones con competición/temporada cerrada y bifurcaciones repetidas de la misma ronda.

### Promoción Admin

- Propuesta de cuatro cupos: Liga A N−3 y N−2, Liga B 2.º y 3.º. Mostrar posiciones base, propuesto y confirmado por separado.
- Corrección manual con motivo obligatorio, cuatro participantes activos únicos de la temporada y auditoría. Corrimientos ambiguos por Copa A/B requieren decisión Admin.
- Exactamente dos cruces fijos: B 2.º contra A N−2 y B 3.º contra A N−3, con una misma Fecha. No permitir cruces libres ni modificar cupos después de crear los encuentros.
- Reutilizar CupEncounter y TAFA. Sólo con ambos ganadores confirmados generar cuatro movimientos propuestos: ganadores a Liga A, perdedores a Liga B; no aplicar automáticamente cambios de división.
- Mostrar la vista previa y los movimientos persistidos por separado. No regenerar movimientos confirmados/aplicados ni mutar una competición o temporada cerrada.

### Resultados finales e IFFHS Admin

- `competition_results` sigue siendo la única fuente de resultados finales: confirmar un snapshot completo con una fila por entrada y auditoría atómica; permitir revisión mientras competición/temporada no estén archivadas.
- Propuesta desde tabla definitiva de Liga, grupos, supervivencia y encuentros confirmados. Fases ambiguas requieren revisión explícita Admin; no inferir ganadores pendientes. Tercero sólo en Total/Papa.
- Dúos con más de dos integrantes históricos requieren selección explícita de `detail.iffhsUserIds`, todos pertenecientes a esa historia.
- IFFHS Admin permite revisar pendientes, calcular temporada, consultar ventana de cinco temporadas, faltantes y desglose por participante/competición, diferenciando `calculated` e `imported`.
- La importación manual sólo agrega totales faltantes: no sobrescribir totales existentes. El cálculo sigue bloqueado si la temporada contiene importados.

### Transición de temporada Admin

- Generar/recuperar propuesta, revisar issues y destinos A/B, confirmar y aplicar son pasos separados. Cambiar propuesta o confirmar una fila marcada para revisión requiere motivo.
- Mostrar origen, división actual/propuesta/confirmada y motivos por participante. Conservar los issues originales como referencia; la confirmación queda auditada.
- No está definida la inclusión de participantes inactivos en la siguiente temporada. Si el plan contiene alguno, bloquear su aplicación en UI y backend con nombres y explicación; no excluirlo, incluirlo ni reactivarlo automáticamente.
- Revalidar antes de aplicar que cada participante del plan tenga IFFHS de la temporada origen. Totales de terceros no cubren faltantes del plan.
- No aplicar sobre una temporada destino existente. Al aplicar correctamente, mostrar la nueva temporada en `draft` y permitir abrirla desde Admin.

### Contextos deportivos del participante por Fecha

- Una Fecha sigue teniendo un único pronóstico de 12 partidos y un único envío/reenvío. Mostrar sus contextos sobre el formulario sin duplicar controles.
- GET `/api/participant/rounds/:roundId/competition-contexts` usa exclusivamente la sesión participante y sólo Fechas abiertas/finalizadas. No acepta un usuario arbitrario.
- Derivar Liga por división; grupos por pertenencia; eliminatorias por encuentros; Total por segmentos/mini-fixtures; TAFA por sus propias Fechas y entradas, incluso sin vínculo TIEBREAK.
- Dúos evalúa membresía en la Fecha: límite inferior inclusivo y superior exclusivo. Nombres y compañero se reconstruyen con esos integrantes, no con el nombre actual del dúo.
- No excluir historia por estado actual de entrada. Survival excluye Fechas posteriores a eliminación/clasificación confirmada; knockout exige un encuentro real en esa Fecha.
- La lista general de competiciones de temporada es histórica (`SEASON_HISTORY`); no demuestra vigencia de Dúos en una Fecha. Usar siempre el endpoint específico para ello.
- No recalcular standings ni TAFA en frontend. Reutilizar cálculo de segmentos existente para mini-fixtures de Total.

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
- Etapa 1 de diseño autorizada: tema exclusivamente oscuro, negro/carbón, texto blanco/gris y verde brillante moderado. Usar el logo TAFA oficial sin rediseñarlo.
- Centralizar paleta, tipografías, spacing y radios 4/6/8 px en `src/design-tokens.css`; componentes compartidos en `src/components.css` y `src/ui.tsx`. Sin gradientes, glow, blur decorativo ni emojis.
- Etapa 2: Home y Competiciones reales usan APIs existentes. Sólo se permite ampliar lecturas para exponer datos ya persistidos sin alterar reglas. Referencias ficticias neutras exclusivamente en `/design` bajo `import.meta.env.DEV`; nunca en Home productiva. Sin migraciones ni cambios deportivos. Ver `DESIGN-SYSTEM.md`.
- Navegación participante mediante hash, header compacto con menú de perfil; barra inferior móvil con cuatro destinos. Retirar el prompt visible de instalación, conservando manifest y service worker.
- Etapa 4: Admin compacto, Fechas con búsqueda cronológica y confirmaciones, directorio de Competiciones y Participantes con filtros/menús. Reutilizar APIs sin nuevas reglas, schema ni migraciones. Credenciales recién asignadas sólo en memoria hasta cerrar el diálogo; nunca recuperar contraseñas existentes.
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

### Diseño Etapa 5 — participante
- Competiciones tiene rutas hash por edición; no oculta las competiciones ajenas. Usar únicamente estados persistidos y ganadores confirmados.
- Overview público de sesión participante: sólo lectura, sin campos privados, preserva vigencia de integrantes y resultados históricos. No recalcular deportes en frontend.
- Liga usa tabla compacta y perfil básico; zonas de referencia conservadas desde backend. Movimiento de posición pendiente de un comparador histórico explícito.

### Diseño Etapa 6 — Mi Club, perfiles e historial
- Mi Club y perfiles comparten presentación; sólo exponer identidad pública, Liga y Fechas finalizadas. Nunca teléfono, credenciales ni información Admin.
- Historial de Fechas separado de auditoría de envíos y enfrentamientos. Consumir pronósticos oficiales y puntuación persistida; reveal sigue limitado a Fechas finalizadas.
- Enfrentamientos sin consolidado histórico fiable muestra estado vacío, sin reconstruir estadísticas deportivas.
- Fixtures de Club/perfil/historial exclusivamente DEV. Sin migraciones ni cambios deportivos.

### Diseño Etapa 7 — assets
- Conservar el logo TAFA original. Imágenes compartidas con proporción intacta y fallback de iniciales ante ausencia/error.
- Registros frontend por code/ID estable y overrides por temporada. Sólo archivos suministrados o URLs reales del backend; sin generación, descargas, uploads, DB ni migraciones.
- Ver ASSETS.md. Preview de assets exclusivamente DEV.
