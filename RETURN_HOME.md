# ProdeTAFA - checklist para cuando Rodrigo vuelva a la PC

Actualizado: 2026-09-11

## Regla importante confirmada

Los partidos cargados como `PENALTIES_ONLY` usan:

- marcador de los 90 minutos para puntaje base 3 / 1 / 0;
- elección del ganador de la tanda;
- +1 punto extra si acierta quién gana por penales.

No volver a simplificar este tipo a solo ganador de penales.

## Fase 1

El desarrollo de Fase 1 está terminado. Queda validación real en producción:

1. `git pull`
2. `npm install`
3. `npm run test`
4. `npm run build`
5. Aplicar migraciones remotas: `npm run db:migrate:remote`
6. Verificar que se aplique `0002_league_seasons.sql` además de la migración inicial.
7. Primer deploy con el flujo documentado en `PRODUCTION.md`.
8. Abrir la URL `workers.dev` y ejecutar el smoke test.
9. Entrar como admin y participante.
10. Verificar crear/publicar fecha, autosave, envío y reenvío.
11. Verificar bloqueo real en kickoff + 1 minuto.
12. Verificar sincronización de resultados, puntos y cierre de fecha.
13. Confirmar que el Cron corre en producción.
14. Revisar consumo real de la cuota gratis de API-Football.

## Fase 2 - Liga

Decisiones confirmadas:

- La temporada de Liga se crea primero y después se vinculan las fechas.
- Son 5 fechas por Liga.
- Si alguien no juega una fecha, suma 0.
- Se permiten altas de participantes a mitad de temporada y arrancan desde 0 en lo anterior.
- La tabla se actualiza cuando termina cada partido, nunca con puntos provisionales.
- Desempate: puntos, plenos, parciales, menos errores y extras.
- Admin y participantes ven la Liga.
- Copas, tabla histórica general, palmarés, perfiles avanzados y estadísticas divertidas quedan para fases posteriores.
- WhatsApp queda separado por ahora.

Implementado mientras Rodrigo estaba en el trabajo:

- Migración `0002_league_seasons.sql`.
- Temporadas de Liga.
- Vínculo de hasta 5 fechas en orden.
- Incorporación automática de participantes activos a Ligas abiertas.
- Alta tardía de participantes sin puntos retroactivos.
- Tabla acumulada de Liga sólo con partidos definitivos.
- Cierre de Liga únicamente con las 5 fechas finalizadas.
- Navegación Admin: `Fechas | Liga | Participantes`.
- Navegación Participante: `Pronósticos | Liga | Historial`.
- Historial de fechas separado.
- PWA base y aviso de instalación.

## Prueba de Liga al volver

1. Crear una temporada, por ejemplo `Liga TAFA Prueba`.
2. Vincular 5 fechas.
3. Confirmar que el orden quede 1 a 5.
4. Revisar la tabla con todos los participantes activos en 0.
5. Crear un participante nuevo con la Liga ya empezada y comprobar que se incorpore con 0 previo.
6. Dejar un participante sin enviar una fecha y comprobar que esa fecha le aporte 0.
7. Finalizar un partido y comprobar que la tabla cambie sólo después del resultado definitivo.
8. Confirmar que un partido en vivo/provisional no cambie la tabla de Liga.
9. Cerrar las 5 fechas.
10. Finalizar la Liga y comprobar que ya no permita cambiar sus fechas.

## Al volver

Primero aplicar la migración nueva y hacer el deploy/pruebas de Fase 1. Después probar la Liga con el bloque anterior. Si ambos quedan verdes, Fase 1 queda oficialmente cerrada y Fase 2 queda funcionalmente encaminada.
