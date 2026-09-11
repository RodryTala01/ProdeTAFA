# ProdeTAFA - checklist para cuando Rodrigo vuelva a la PC

Actualizado: 2026-09-11

## Regla importante confirmada

Los partidos cargados como `PENALTIES_ONLY` usan:

- marcador de los 90 minutos para puntaje base 3 / 1 / 0;
- eleccion del ganador de la tanda;
- +1 punto extra si acierta quien gana por penales.

No volver a simplificar este tipo a solo ganador de penales.

## Fase 1

El desarrollo de Fase 1 esta terminado. Queda validacion real en produccion:

1. `git pull`
2. `npm install`
3. `npm run test`
4. `npm run build`
5. Primer deploy con el flujo documentado en `PRODUCTION.md`.
6. Abrir la URL `workers.dev` y ejecutar el smoke test.
7. Entrar como admin y participante.
8. Verificar crear/publicar fecha, autosave, envio y reenvio.
9. Verificar bloqueo real en kickoff + 1 minuto.
10. Verificar sincronizacion de resultados, puntos y cierre de fecha.
11. Confirmar que el Cron corre en produccion.
12. Revisar consumo real de la cuota gratis de API-Football.

## Fase 2 avanzada mientras Rodrigo estaba en el trabajo

- PWA base ya preparada.
- Historial de fechas para participantes.
- Pronosticos de todos revelados solo despues del cierre.
- Tabla general acumulada entre fechas finalizadas.
- Estadisticas acumuladas: puntos, promedio, plenos, parciales, errores, extras y fechas jugadas.
- Resumen de las ultimas fechas del participante.
- Proteccion adicional contra operaciones API iniciadas desde sitios externos.

## Al volver

Primero terminar el deploy y prueba de Fase 1. Si todo queda verde, declarar Fase 1 cerrada y continuar Fase 2 desde `ROADMAP.md`.
