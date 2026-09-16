# ProdeTAFA — Roadmap

## Estado actual

El núcleo del Prode y la Liga ya funciona en entorno local y fue probado por el usuario con flujo Admin + Participante.

### Núcleo implementado

- [x] Cuenta inicial de administrador.
- [x] Login por teléfono y contraseña.
- [x] Contraseñas hasheadas y sesiones HttpOnly.
- [x] Alta, reset de clave, desactivación y reactivación de participantes.
- [x] Creación de fechas.
- [x] Búsqueda semanal/rango de partidos reales con API-Football.
- [x] Selección de 12 partidos por fecha.
- [x] Sólo una fecha publicada/abierta a la vez.
- [x] Inmutabilidad de partidos después de publicar.
- [x] Autosave de pronósticos.
- [x] Envío y reenvío.
- [x] Bloqueo kickoff + 1 minuto.
- [x] PENALTIES_ONLY: marcador de 90 minutos + elección de ganador de tanda.
- [x] Scoring 3/1/0 + posible extra de penales.
- [x] Correcciones administrativas y auditoría.
- [x] Sincronización API-Football manual y por Cron.
- [x] Puntaje provisional en vivo para ranking Admin.
- [x] Void/anulados.
- [x] Ranking y desempates.
- [x] Cierre manual de fecha.
- [x] Historial básico de fechas.
- [x] Revelado de pronósticos al finalizar.
- [x] Seguridad cross-site en mutaciones.
- [x] Tests, build, CI y health checks.
- [x] D1 remota con migraciones `0001`, `0002` y `0003` aplicadas.
- [x] `FOOTBALL_API_KEY` configurada como secreto de Cloudflare.
- [x] Entorno local levantado y operado mediante Codex sin necesidad de PowerShell manual.

### Liga implementada

- [x] Temporada de exactamente 5 fechas.
- [x] Vincular/desvincular fechas mientras la Liga está abierta.
- [x] Alta tardía con `eligible_from_slot` sin retroactividad.
- [x] No-presentado = 0.
- [x] Tabla sólo con resultados definitivos/no provisionales.
- [x] Desempate: puntos → plenos → parciales → menos errores → extras.
- [x] Tabla para Admin y Participante.
- [x] Historial y navegación móvil.
- [x] PWA base en modo standalone.

## Próxima tanda — Pronósticos y trazabilidad

Prioridad inmediata.

- [x] Crear historial/auditoría detallada de pronósticos.
- [x] Registrar primer envío con fecha/hora.
- [x] No auditar borradores previos al primer envío.
- [x] Al Reenviar, registrar cada cambio oficial efectivo con valor anterior/nuevo.
- [x] Registrar cambios de marcador y de selección `Penales`.
- [x] Registrar cada reenvío.
- [x] Después del primer envío, los cambios quedan pendientes hasta tocar `Reenviar`.
- [x] Historial consultable por Admin desde Fecha y desde Participante.
- [x] Participante puede ver su propio historial.
- [x] Filtros Admin: fecha, participante y tipo de evento.
- [x] Mostrar `Enviado HH:MM` / última hora de presentación.
- [x] Permitir identificar fácilmente quién todavía no presentó, sin construir todavía un dashboard estadístico avanzado.

### Entrada rápida de marcadores

- [x] NORMAL: `Local → Visitante → Local del siguiente partido`.
- [x] PENALTIES_ONLY: `Local → Visitante → Penales → siguiente partido`.
- [x] Avance automático con un dígito válido.
- [x] Saltar controles bloqueados/disabled.
- [x] Usar teclado numérico móvil y navegación de foco.
- [ ] Validar interacción en teléfono físico.
- [x] Mostrar hora exacta de cierre + cuenta regresiva por partido.
- [x] Texto visible para elección extra: `Penales`.

## Pulido de Liga

- [ ] Al tocar participante, mostrar desglose de puntos por Fecha 1–5.
- [ ] Mostrar movimiento de posición `↑N / ↓N`.
- [ ] Antes de implementar movimiento, definir punto de comparación determinístico.
- [ ] Diferenciar claramente puntos provisionales vs definitivos en ranking Admin.
- [ ] Validar una Liga completa real con 5 fechas.

## Historial completo del participante

- [ ] Fecha + posición + puntos.
- [ ] Plenos, parciales, errores y extras.
- [ ] Abrir fecha y ver los 12 pronósticos.
- [ ] Comparar contra resultados reales.
- [ ] Ver puntos obtenidos partido por partido.
- [ ] Perfil estadístico transversal queda para después.

## Participantes y acceso — mejoras

- [ ] Permitir al participante cambiar su propia contraseña.
- [ ] El admin mantiene capacidad de resetear/asignar nueva contraseña.
- [ ] Nunca mostrar ni almacenar contraseña actual en texto plano.
- [ ] Nombre y teléfono siguen siendo administrados exclusivamente por Admin.
- [ ] Agregar escudo/avatar cuando el recurso visual esté disponible.

## Dashboard Admin

- [ ] Crear inicio Admin simple con información operativa.
- [ ] Mostrar fecha activa, contexto de Liga/Copa y acciones importantes.
- [ ] Mantener estadísticas avanzadas para una fase posterior.
- [ ] No agregar duplicación de fechas.
- [ ] No borrar fechas: implementar archivar/cancelar preservando historial.

## Clasificación de fechas

Se desea identificar el contexto de cada fecha.

- [ ] Liga.
- [ ] Copa.
- [ ] Desempate.
- [ ] Definir si hace falta tipo Test/Amistoso para entorno operativo.

La semántica de Copa y Desempate se define antes de crear migraciones definitivas para esos formatos.

# Siguiente gran fase — Copas

Las Copas se juegan intercaladas con la Liga; no son una temporada independiente que ocurre después.

Patrón conceptual:

`32avos Copas → Fecha 1 Liga → Fecha Copas → Fecha 2 Liga → Fecha Copas → Fecha 3 Liga → ...`

Hay varias Copas en simultáneo o dentro del mismo calendario general.

### Antes de programar Copas hay que definir

- [ ] Cuántas Copas pueden existir en una temporada.
- [ ] Cómo se asignan participantes a cada Copa.
- [ ] Si todos juegan todas las Copas o existen clasificaciones distintas.
- [ ] Formato: eliminación directa, grupos u otro.
- [ ] Cantidad de participantes y manejo de byes.
- [ ] Qué significa exactamente `32avos Copas` cuando existen varias Copas.
- [ ] Cómo se determina un ganador de cruce usando los 12 partidos del Prode.
- [ ] Desempates de cruces.
- [ ] Qué es una `Fecha Desempate` y cuándo se usa.
- [ ] Qué ocurre si un participante no presenta.
- [ ] Cómo avanzan los cruces.
- [ ] Qué ve el participante y qué administra el Admin.
- [ ] Cómo se muestran varias Copas sin recargar la navegación.

La Liga de 5 fechas debe seguir funcionando aunque las fechas de Copa estén intercaladas cronológicamente.

## Después de Copas

### Tabla general histórica

- [ ] Acumulado histórico.
- [ ] Ligas/Copas disputadas.
- [ ] Resultados por temporada.

### Palmarés

- [ ] Campeonatos de Liga.
- [ ] Copas.
- [ ] Subcampeonatos y otros reconocimientos a definir.

### Perfil y estadísticas avanzadas

- [ ] Estadísticas por participante.
- [ ] Rachas.
- [ ] Mejores/peores fechas.
- [ ] Plenos históricos.
- [ ] Estadísticas divertidas.

## Avisos internos

- [ ] Avisos dentro de la app antes de integrar servicios externos.
- [ ] Ejemplo: partidos sin completar, acción pendiente, nueva fecha disponible.
- [ ] WhatsApp/push quedan para después.

## Diseño

Se hace después de cerrar la lógica funcional principal, especialmente Copas.

- [ ] Pulido visual general.
- [ ] Mejor experiencia móvil.
- [ ] Definir identidad/colores TAFA.
- [ ] Escudos/avatares.
- [ ] Mantener modo claro por ahora; modo oscuro queda para después.

## PWA y Android — etapa final

- [ ] Finalizar iconos PWA PNG 192/512/maskable.
- [ ] Validar instalación real en Android.
- [ ] Validar actualización de versión instalada.
- [ ] Después del diseño final, empaquetar como APK/AAB sin duplicar la lógica de negocio.
- [ ] Evaluar TWA primero; Capacitor sólo si hacen falta funciones nativas más profundas.

## Producción pendiente de validación completa

- [ ] Confirmar URL pública definitiva `workers.dev`/dominio.
- [ ] Ejecutar smoke test completo contra producción.
- [ ] Probar Admin + Participante en producción.
- [ ] Verificar bloqueo real kickoff + 1 minuto.
- [ ] Verificar Cron desplegado.
- [ ] Medir consumo real de API-Football.
- [ ] Confirmar instalación PWA desde HTTPS.

## Orden de avance acordado

1. Historial/auditoría + mejoras de carga de pronósticos.
2. Pulido/validación de Liga.
3. Definir e implementar Copas + Desempates intercalados con Liga.
4. Historial completo, perfiles y estadísticas.
5. Dashboard y pulido final de Admin/Participante.
6. Diseño visual definitivo.
7. PWA final.
8. APK/AAB como último gran paso.
