# ProdeTAFA — Roadmap

## Fase 1 — MVP

### Implementado

- [x] Cuenta inicial de administrador.
- [x] Login por teléfono y contraseña.
- [x] Contraseñas hasheadas y sesiones HttpOnly.
- [x] Alta, reset de clave, desactivación y reactivación de participantes.
- [x] Creación de fechas.
- [x] Búsqueda semanal/rango de partidos reales con API-Football.
- [x] Selección de 12 partidos por fecha.
- [x] Publicación de fecha.
- [x] Autosave de pronósticos.
- [x] Envío explícito de pronóstico.
- [x] Edición hasta kickoff + 1 minuto.
- [x] Bloqueo real en backend.
- [x] Partido marcado `PENALTIES_ONLY`: marcador de 90 minutos + ganador de la tanda.
- [x] 3/1/0 sobre los 90 minutos + hasta 1 punto extra por acertar penales.
- [x] Corrección administrativa de marcador + ganador de penales.
- [x] Sincronización automática de resultados por Cron Trigger.
- [x] Sincronización manual de resultados.
- [x] Pleno 3 / parcial 1 / error 0.
- [x] Puntos provisionales en vivo cuando hay datos suficientes.
- [x] Tratamiento de partidos anulados.
- [x] Ranking y desempates.
- [x] Cierre de fecha.
- [x] Historial de fechas para participantes.
- [x] Corrección manual de resultados.
- [x] Edición excepcional de pronósticos por admin.
- [x] Auditoría de intervenciones.
- [x] Revelado de pronósticos enviados después del cierre de la fecha.
- [x] Build automático en GitHub Actions.
- [x] Tests automáticos de reglas de scoring.
- [x] Smoke test para producción.
- [x] `FOOTBALL_API_KEY` declarada como secreto obligatorio de Cloudflare.
- [x] Flujo de primer deploy preparado con carga segura del secreto.
- [x] Checklist de puesta en producción documentado en `PRODUCTION.md`.

### Pendiente para declarar Fase 1 cerrada

- [ ] Hacer el primer deploy real a `workers.dev` desde una sesión autenticada de Cloudflare.
- [ ] Ejecutar el smoke test contra la URL real.
- [ ] Probar end-to-end Admin + Participante con una fecha real o de prueba.
- [ ] Verificar en producción el bloqueo efectivo en kickoff + 1 minuto.
- [ ] Verificar sincronización automática del Cron Trigger desplegado.
- [ ] Medir el consumo real de cuota de API-Football y ajustar la frecuencia si fuera necesario.

## Fase 2 — Liga

Objetivo: dejar lista una Liga de temporada compuesta por 5 fechas del Prode. No incluir todavía copas, tabla histórica general, palmarés ni perfiles avanzados.

### Reglas confirmadas

- [x] El admin crea una temporada de Liga y luego vincula sus fechas.
- [x] Cada Liga tiene exactamente 5 fechas.
- [x] Un participante que no juega una fecha suma 0.
- [x] Se puede incorporar un participante a mitad de temporada; arranca con 0 en las fechas anteriores.
- [x] La tabla se actualiza partido por partido, pero sólo cuando cada resultado queda definitivo.
- [x] No sumar puntos provisionales a la tabla de Liga.
- [x] Desempate: puntos → plenos → parciales → menos errores → extras.
- [x] La Liga está disponible tanto para admin como para participantes.

### Implementado

- [x] Esquema `league_seasons`, `league_rounds` y `league_participants` en migración `0002_league_seasons.sql`.
- [x] Crear temporadas.
- [x] Vincular hasta 5 fechas en orden.
- [x] Desvincular fechas mientras la Liga siga abierta.
- [x] Incorporación automática de participantes activos a Ligas abiertas.
- [x] Soporte para altas tardías sin puntos retroactivos.
- [x] Tabla de Liga calculada sólo con partidos definitivos.
- [x] Cierre de Liga sólo cuando las 5 fechas están vinculadas y finalizadas.
- [x] Vista Admin: Fechas | Liga | Participantes.
- [x] Vista Participante: Pronósticos | Liga | Historial.
- [x] Historial de fechas separado de la pantalla de pronósticos.
- [x] PWA base y aviso de instalación cuando el navegador lo permite.
- [x] Protección adicional contra operaciones API iniciadas desde sitios externos.

### Pendiente de validación

- [ ] Aplicar `0002_league_seasons.sql` a D1 remota.
- [ ] Crear una Liga de prueba y vincular 5 fechas.
- [ ] Verificar alta de participante a mitad de temporada.
- [ ] Confirmar que un no-presentado suma 0.
- [ ] Confirmar que la tabla se mueve al finalizar cada partido, no antes.
- [ ] Confirmar cierre de Liga tras la quinta fecha.
- [ ] Confirmar instalación PWA en Android desde producción.
- [ ] Agregar íconos PNG 192x192 y 512x512 / maskable si Android los requiere.

## Fases posteriores

- Copas: formato y reglas a definir después de cerrar la Liga.
- Tabla general histórica: postergar hasta después de Copas.
- Palmarés: postergar.
- Perfil individual y estadísticas avanzadas: postergar.
- Estadísticas divertidas/rachas: postergar.
- WhatsApp y automatizaciones: mantener separado por ahora.

## Regla de avance

Primero garantizar que el ciclo completo de Liga `crear temporada → vincular 5 fechas → pronosticar → puntuar partidos definitivos → acumular tabla → cerrar Liga` funcione correctamente en producción.
