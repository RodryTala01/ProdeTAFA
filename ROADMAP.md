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
- [x] `PENALTIES_ONLY` sin marcador, sólo ganador de la tanda.
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
- [x] Build automático en GitHub Actions.

### Pendiente para declarar Fase 1 cerrada

- [ ] Probar end-to-end con una fecha real o de prueba: crear 12 partidos, publicar, pronosticar desde un participante, enviar, simular cierre y verificar puntaje.
- [ ] Revisar en runtime la corrección administrativa de un ítem `PENALTIES_ONLY` y simplificar su editor para que tampoco pida marcador.
- [ ] Definir/implementar el selector extra para partidos eliminatorios normales cuando corresponda pronosticar quién clasifica. El scoring ya acepta el extra; falta una bandera explícita por partido y su UI.
- [ ] Configurar `FOOTBALL_API_KEY` como secreto del Worker de producción.
- [ ] Hacer el primer deploy real a `workers.dev` y smoke test con D1 remota.
- [ ] Revisar el comportamiento del Cron Trigger ya desplegado y el consumo real de cuota de API-Football.

## Fase 2 — Producto usable y móvil

### Ya iniciado

- [x] Manifest PWA.
- [x] Service worker para assets estáticos sin cachear `/api/*`.
- [x] Metadatos de instalación móvil.
- [x] Ícono SVG base.

### Próximo alcance recomendado

- [ ] Confirmar instalación PWA en Android desde producción.
- [ ] Agregar íconos PNG 192x192 y 512x512 / maskable si el navegador o Android lo requieren.
- [ ] Pantalla de historial más completa con resumen por fecha.
- [ ] Revelar pronósticos de todos los participantes sólo cuando la fecha haya finalizado.
- [ ] Mejorar estado en vivo y feedback de actualización.
- [ ] Pantalla general de posiciones acumuladas entre fechas.
- [ ] Palmarés e historial del Prode.
- [ ] Estadísticas por participante: plenos, parciales, errores, puntos por fecha, rachas.
- [ ] Mejoras de UX móvil y accesibilidad.
- [ ] Hardening adicional de seguridad: validación explícita de Origin/CSRF para operaciones mutantes.

## Fase 3 — Automatización y distribución

- [ ] Recordatorios automáticos antes del cierre.
- [ ] Integración WhatsApp para recordatorios y resultados.
- [ ] Generación automática de tabla/imagen para compartir por WhatsApp.
- [ ] Notificaciones push PWA.
- [ ] Herramientas administrativas para temporadas, palmarés e históricos.
- [ ] Monitoreo de errores y métricas de uso.

## Regla de avance

No bloquear el desarrollo por estética o estadísticas avanzadas. Primero garantizar que el ciclo completo `crear fecha → pronosticar → bloquear → sincronizar → puntuar → cerrar` funcione correctamente en producción.
