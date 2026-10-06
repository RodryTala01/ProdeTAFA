# Prode TAFA · Identidad 01

## Alcance

UI/UX exclusivamente. T32 sigue siendo la base funcional. No cambia reglas, endpoints, modelos ni migraciones. Sin deploy ni cambios productivos. La navegación real conserva sus destinos; las referencias de Inicio y Competiciones no introducen nuevas consultas ni cálculos deportivos.

## Revisar localmente

Servidor de esta revisión: `http://127.0.0.1:5174` con `vite.e2e.config.ts`, D1 explícitamente local en `.wrangler/e2e-t32`.

- `/`: Login y app real local.
- `/design?view=home`: Inicio de referencia.
- `/design?view=predictions`: lista interactiva de 12 partidos de ejemplo.
- `/design?view=competitions`: listado de referencia.
- `/design?view=login`: mismo componente real de Login.
- `/design?view=system`: controles, estados y modal nativo accesible.

La franja de referencia identifica los datos ficticios. Los marcadores de referencia viven sólo en memoria; el botón Enviar no llama a la API. `/design` se importa dinámicamente sólo bajo `import.meta.env.DEV`: Vite elimina el módulo y sus fixtures del build productivo. Login de referencia reutiliza el login local; no es una cuenta ficticia conectada a producción.

## Fundamentos

- Negro `--bg`, carbón para superficies, blanco y grises para lectura. Verde lima moderado para acciones/foco/selección. Sin gradientes, blur, glow ni sombras decorativas.
- Semántica: verde clasificación/éxito; amarillo Promoción y advertencias; rojo errores/descenso; azul reservado para Copa Campeones. Los estados también tienen texto.
- `src/design-tokens.css` contiene toda la paleta CSS, familias tipográficas, escala de espaciado, radios y dimensiones compartidas. `theme-color` de HTML/manifest replica `--bg` porque esos formatos no aceptan variables CSS.
- Sans de sistema para cuerpo. Arial Narrow/Roboto Condensed/Franklin Gothic Medium con fallback Arial para títulos y números; sin fuentes externas ni dependencias nuevas. La apariencia exacta de la condensada depende del sistema.
- Números tabulares. Títulos compactos, jerarquía fuerte y pocos niveles. Evitar etiquetas decorativas y cards anidadas.
- Radios: 4 px auxiliares; 6 px controles; 8 px paneles. Controles y botones de al menos 44 px. Márgenes de 4/8/12/16/24/32/48 px mediante tokens.

## Componentes

`src/components.css`: botones primary/secondary/ghost/danger/icon, inputs y select oscuros, focus visible, error/success/disabled, tablas numéricas, alertas, estados, modal y navegación base. `src/styles.css`: shell, header, Login y layouts existentes.

`src/ui.tsx`: Brand, iconos SVG outline propios (no son un logo), PasswordField con label/toggle accesible, TeamIdentity con escudo o iniciales neutras. No emojis ni nueva dependencia de iconos.

`src/CompetitionList.tsx`: presentación reutilizable de nombre, fase/rival, estado, posición y espacio para logo. Los datos deben venir del backend; no calcula elegibilidad ni standings. `src/sports-components.css` define esta lista y los bloques deportivos de referencia.

`src/participant-round.css`: filas separadas por líneas; Local → marcador → marcador → Visitante también en móvil. Penales mantiene sus dos controles. Se conservan los handlers de autosave, envío/reenvío, bloqueo y foco. Contextos se presentan sin card extra. Historial, resultados y puntajes siguen disponibles.

## Logo y futuros recursos

`public/brand/tafa.png` es una copia exacta del PNG oficial provisto por el usuario, sin reinterpretación, recorte, recoloración ni edición. Se mantiene la proporción, los colores y el sol. Tamaño original: 505.822 bytes; se usa a 30×48 o 58×92 CSS px. No se agregaron imágenes decorativas.

Los futuros escudos de participantes/clubes y logos de competición pueden ocupar los slots de TeamIdentity/CompetitionList. Los monogramas actuales son placeholders neutros, no nuevos escudos. Favicon e iconos instalables existentes quedan para el bloque PWA; no se implementa un nuevo install prompt ni bloqueo de zoom.

## Validación

Tests de contrato de contraste WCAG AA, Login/autofill, contraseña oculta y toggle que no envía el formulario, centralización de colores. Tests existentes del recorrido de foco y suite completa.

Revisión de navegador a 1440×960, 768×1024 y 390×844; Login, referencias y pantallas reales de Admin/Participante. El smoke local verifica envío/reenvío, penales, persistencia visual, lectura de Liga/Historial y ausencia de overflow general. Tablas anchas conservan scroll en su propio contenedor.

## Etapa 2 · Navegación y Home reales

- Rama `design/02-navigation-home`, posterior al merge de Etapa 1 (`c2f1d8f`). Sin deploy.
- Participante: Inicio, Pronósticos, Competiciones y Mi Club. Admin conserva su navegación. Login de participante abre Inicio; refrescar conserva la sección mediante hash y Atrás usa el historial del navegador. No se agrega router ni dependencia.
- `ParticipantDashboard.tsx` organiza la navegación; `ParticipantHome.tsx` presenta Inicio, directorio y Mi Club; `participant-home.ts` concentra lecturas y adaptación visual. Se conservan ParticipantRound, LeagueView, ParticipantHistory y PredictionHistoryBrowser.
- Home lee `/api/participant/round`, `/api/competition-engine/current`, standings de la división propia y contextos de la Fecha abierta. La última Fecha finalizada nunca se presenta como próxima. Borrador y cambios pendientes se detectan comparando los valores ya expuestos por backend; no se modifica autosave/envío/scoring.
- Extensión mínima read-only: `season.competitionCatalog` en `/api/competition-engine/current` expone nombre, código, familia y estado de todas las competiciones persistidas de la temporada activa. El campo histórico `competitions` y su semántica `SEASON_HISTORY` no cambian. Sin nuevas rutas, migraciones ni escrituras.
- Liga usa posición/puntos devueltos por backend. La división propia se muestra primero; los enlaces de Liga A/B permiten abrir explícitamente la tabla existente. No se reconstruyen fases ni elegibilidad en cliente.
- Sin contexto específico de la Fecha, una membresía histórica se muestra como “Participación registrada”, nunca como “En juego” ni con un compañero Dúos supuesto. Si no existe membresía ni contexto, se indica “No participa”. El catálogo no inventa competiciones que no estén configuradas.
- Lecturas al entrar a secciones de resumen, reintento explícito, refresco cada minuto y al recuperar foco. Errores parciales permiten seguir usando las secciones que cargaron.
- Mi Club agrupa identidad, Liga y accesos al historial. Escudos pendientes usan iniciales. No hay perfil editable ni estadísticas nuevas.
- No se monta PwaInstallPrompt. Manifest/service worker siguen intactos.

### Datos que quedan pendientes

- No hay backend de anuncios: se presenta el estado vacío, sin avisos simulados.
- No existe resumen único de fase/eliminación vigente para todas las Copas. Se muestra sólo participación histórica y contextos reales de la Fecha; los interiores completos quedan para Etapa 5.
- No se incorporan escudos definitivos, estadísticas avanzadas, brackets ni lógica deportiva. Los fixtures de `/design` ahora usan nombres neutros y siguen excluidos del build productivo.

## Etapas siguientes (sin implementar)

- Etapa 4: continuar el plan de diseño aprobado, sin cambios deportivos en este bloque.
- Extender la composición compacta a los interiores de cada competición, preservando su motor específico.
- Integrar escudos/trofeos definitivos y preparar iconos instalables oficiales en la fase PWA.
- Revisar instalación real en dispositivos y ergonomía con teclado virtual cuando se aborde la etapa mobile.
## Etapa 3 · Pronósticos

- Fixture continuo, header compacto, escudos sin recorte, columnas únicas en escritorio. Contextos y resultados de cruces usan exclusivamente datos existentes del backend.
- Contador sin barra: borrador de partidos editables y snapshot oficial para cerrados. Marcadores enteros 0–99 (validación existente); Penales requiere selección. Denominador: partidos de la Fecha (12 publicada). Los cerrados sin pronóstico no bloquean el envío de abiertos.
- Autosave conserva debounce de 500 ms y cola serial por partido. Indicador global marca pendiente desde la edición, con versión de edición para evitar que respuestas anteriores anuncien Guardado. Los errores identifican partido y ofrecen reintento.
- Primer envío directo. Reenvío con diferencias abre diálogo Antes/Ahora contra officialPrediction, incluyendo nombres del ganador por penales. Mientras se revisa se bloquea edición y actualización del snapshot por polling; el reloj sigue cerrando partidos. Cancelar no publica. Confirmar conserva el guardado y endpoint existentes. Sin diferencias se conserva el evento de reenvío directo.
- Cerrados muestran oficial en modo lectura. Finalizados colapsan por defecto manteniendo equipos, horario, pronóstico, resultado y puntos; detalle expandible para metadatos y penales. Sin abiertos no hay botón Enviar. Historial, ranking y revelado final permanecen.
- Countdown usa reloj local corregido con serverNow. Advertencia visual a menos de 10 minutos (sin cambiar lockedAt). Un timer existente de un segundo y refresh existente de un minuto; formateador de fecha compartido. Sin nuevas llamadas a API-Football.
- Vista compacta reduce ayuda y countdown lejano; mantiene horario y cierre exacto accesible. Preferencia opcional localStorage `tafa.predictions.compact`, tolerante a almacenamiento no disponible.
- Diálogo nativo, labels, aria-live global, aria-pressed en penales, aria-expanded en detalles y restauración de foco. Sin dependencias nuevas en frontend; happy-dom es sólo de desarrollo para tests de interacción React.
- Sin backend, migraciones, scoring ni reglas nuevas. Etapa 4 no iniciada.
## Etapa 4 · Admin

- Navegación principal Fechas / Competiciones / Participantes. Ingreso abre Fechas; perfil y cierre de sesión en menú compacto.
- Fechas: sidebar por ID descendente, selección inicial de la abierta o más reciente; nueva Fecha seleccionada automáticamente. Búsqueda por horario ascendente y filtro conservado al agregar. Partidos existentes también por kickoff, sin orden manual. Contador X/12, faltantes y bloqueo de Publicar cuando ya existe una abierta.
- Confirmaciones nativas accesibles para publicar/cerrar/quitar, desvincular y cambiar estado de temporada. Mantienen todos los endpoints y sus validaciones. Menús secundarios con Escape/click exterior, sin nuevas dependencias.
- Directorio de Competiciones muestra únicamente datos persistidos: familia, estado, etapas activas si existen, vínculos y ausencia de etapas/Fechas. No se infieren clasificaciones ni ganadores. Herramientas de temporada, IFFHS y transición en sección desplegable; cada administración específica conserva su motor.
- Liga A/B se administra desde su entrada de Competiciones. La Liga anterior conserva un acceso explícito independiente, también disponible sin temporada TAFA. No se confunden ni migran ambas estructuras.
- Participantes: búsqueda nombre/teléfono, Todos/Activos/Inactivos, acciones en menú, alta/cambio de clave en modal y confirmación de desactivación. Copia de credenciales sólo después de asignarlas; memoria efímera hasta cerrar el diálogo, sin almacenamiento ni recuperación de contraseñas.
- Layout denso con tablas desplazables, sidebar acotada en móvil, tokens existentes y targets de 44px. Sin cambios de backend, schema, migraciones, reglas deportivas, cron ni secrets.
- Pendientes deliberados: importación múltiple, assets definitivos y editor nuevo de brackets. No se implementan en esta etapa. Se conservan componentes y cruces existentes.

## Etapa 5 — Competiciones y Liga
- Directorio completo, rutas hash por Copa y edición; cuadros de resultados persistidos, grupos desde cálculos existentes, tabla Dúos por Fecha y cuadro fijo de Campeones.
- Lectura participante `/api/competition-engine/overview`: catálogo, etapas, membresías históricas, cruces guardados y resultados confirmados; sin teléfonos, credenciales ni escrituras. Temporadas draft excluidas.
- Liga compacta: estadísticas secundarias ocultas en móvil, perfil básico por enlace, zonas de referencia anteriores trasladadas al read model sin cambiar clasificación. Sin flechas de movimiento: no existe un comparador histórico fiable.
- `/design?view=competitions-full` y `/design?view=league`: fixtures ficticios DEV-only, sin requests. Trofeos/escudos definitivos pendientes para imágenes.
- Los cuadros muestran datos guardados; su consulta no dispara el refresh con escrituras del endpoint knockout. La confirmación deportiva sigue exclusivamente en Admin.
