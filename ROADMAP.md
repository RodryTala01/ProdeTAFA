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

## Fase 2 — Producto usable y móvil

### Ya implementado/iniciado

- [x] Manifest PWA.
- [x] Service worker para assets estáticos sin cachear `/api/*`.
- [x] Metadatos de instalación móvil.
- [x] Ícono SVG base.
- [x] Historial de fechas para participantes.
- [x] Revelar los pronósticos enviados por todos los participantes sólo después de finalizar la fecha.
- [x] Tabla general acumulada entre fechas finalizadas.
- [x] Estadísticas acumuladas por participante: puntos, promedio, plenos, parciales, errores, extras y fechas jugadas.
- [x] Resumen de las últimas fechas del participante.
- [x] Protección adicional contra operaciones API iniciadas desde sitios externos.

### Próximo alcance recomendado

- [ ] Confirmar instalación PWA en Android desde producción.
- [ ] Agregar íconos PNG 192x192 y 512x512 / maskable si el navegador o Android lo requieren.
- [ ] Mejorar estado en vivo y feedback de actualización.
- [ ] Palmarés e historial de ganadores del Prode.
- [ ] Estadísticas avanzadas por participante: rachas, mejor fecha, peor fecha y evolución.
- [ ] Mejoras de UX móvil y accesibilidad.
- [ ] Revisar CSRF/Origin nuevamente después de tener el dominio final.

## Fase 3 — Automatización y distribución

- [ ] Recordatorios automáticos antes del cierre.
- [ ] Integración WhatsApp para recordatorios y resultados.
- [ ] Generación automática de tabla/imagen para compartir por WhatsApp.
- [ ] Notificaciones push PWA.
- [ ] Herramientas administrativas para temporadas, palmarés e históricos.
- [ ] Monitoreo de errores y métricas de uso.

## Regla de avance

No bloquear el desarrollo por estética o estadísticas avanzadas. Primero garantizar que el ciclo completo `crear fecha → pronosticar → bloquear → sincronizar → puntuar → cerrar` funcione correctamente en producción.
