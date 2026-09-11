# ProdeTAFA — Puesta en producción

Este documento cubre el primer deploy del MVP y de la Liga de Fase 2.

## Antes del primer deploy

La base D1 remota ya está configurada en `wrangler.jsonc`. `FOOTBALL_API_KEY` está declarada como secreto obligatorio y nunca debe subirse al repositorio.

En la PC de desarrollo debe existir `.dev.vars` con:

```text
FOOTBALL_API_KEY=tu_clave_real
```

`.dev.vars` está ignorado por Git.

## Primer deploy

Desde PowerShell, dentro de `ProdeTAFA`:

```powershell
git pull
npm install
npm run deploy:first
```

`deploy:first` ejecuta automáticamente, en este orden:

1. tests;
2. build;
3. migraciones pendientes sobre D1 remota, incluidas `0002_league_seasons.sql` y `0003_league_entry_slot.sql`;
4. deploy del Worker usando `.dev.vars` para cargar `FOOTBALL_API_KEY` como secreto.

Si cualquiera de esos pasos falla, no continuar manualmente sin diagnosticarlo. Al finalizar, Wrangler debe mostrar la URL `https://prode-tafa.<subdominio>.workers.dev`.

## Smoke test

Copiar la URL de Workers y ejecutar:

```powershell
$env:BASE_URL="https://prode-tafa.<subdominio>.workers.dev"
npm run smoke:prod
```

El smoke test comprueba:

- `/api/health`;
- `/api/health/deep`;
- tablas `league_seasons`, `league_rounds` y `league_participants`;
- columna `league_participants.eligible_from_slot` agregada por `0003`;
- que no existan dos fechas `open` simultáneamente;
- frontend principal;
- manifest PWA `standalone` con iconos 192x192 y 512x512 declarados;
- service worker real en `/sw.js`.

Debe terminar con `Smoke test OK`.

## Verificaciones Cloudflare

```powershell
npx wrangler secret list
npx wrangler deployments list
```

En `secret list` debe figurar `FOOTBALL_API_KEY` sin mostrar su valor. En Cloudflare Dashboard revisar además:

- D1 binding `DB` → `prode-tafa`;
- Cron Trigger `*/10 * * * *`;
- `FOOTBALL_API_KEY` como Secret.

## Prueba end-to-end de Fase 1

Usar una fecha real o de prueba con 12 partidos:

1. Admin abre la fecha y ve los 12 partidos.
2. Participante inicia sesión.
3. Cargar pronósticos y comprobar autosave.
4. En `PENALTIES_ONLY`, cargar marcador de 90 minutos + ganador de tanda pronosticado.
5. Enviar y luego modificar/re-enviar un partido todavía abierto.
6. Confirmar bloqueo en kickoff + 1 minuto.
7. Intentar publicar otra fecha mientras esta siga `open`: debe devolver conflicto.
8. Actualizar resultados y confirmar 3/1/0.
9. Confirmar +1 sólo cuando un partido marcado Penales realmente llega a tanda y se acierta el ganador.
10. Probar corrección manual de un partido marcado Penales que NO llegó a tanda: debe quedar sin bonus de penales.
11. Probar corrección manual de uno que sí llegó y elegir ganador de tanda.
12. Usar `Volver a API-Football`: resultado/puntos manuales deben quedar en pendiente hasta recuperar el dato oficial, sin mostrar scoring viejo.
13. Confirmar anulado = 0 y no error.
14. Confirmar ranking/desempates.
15. Confirmar que no se puede cerrar con partidos pendientes.
16. Cerrar la fecha cuando todo esté resuelto.
17. Confirmar ranking final, historial y revelado de pronósticos enviados.
18. Probar edición excepcional de pronóstico y auditoría.
19. Confirmar que una fecha publicada no permite agregar/quitar partidos ni por API directa.

## Prueba inicial de Liga — Fase 2

1. Crear una temporada desde Admin → Liga.
2. Vincular cinco fechas distintas en orden 1 a 5.
3. Verificar que una fecha no pueda vincularse a dos temporadas.
4. Verificar participantes iniciales en 0.
5. Confirmar que sólo entren scores definitivos; provisionales quedan afuera.
6. Con Fecha 1 ya finalizada, crear/reactivar un participante y confirmar que no reciba puntos retroactivos de Fecha 1.
7. Crear/reactivar a alguien mientras una fecha actual siga abierta y confirmar que pueda contar desde esa fecha.
8. Dejar un participante sin enviar una fecha: esa fecha debe aportar 0.
9. Confirmar desempates: puntos, plenos, parciales, menos errores y extras.
10. Confirmar que la Liga no pueda finalizar hasta tener exactamente cinco fechas cerradas.
11. Finalizar las cinco fechas, cerrar Liga y comprobar histórico de temporada.

## Cron y cuota de API-Football

Durante una jornada con partidos verificar que los resultados cambien sin tocar `Actualizar resultados`, revisar consumo en API-Football y confirmar que el Cron de 10 minutos permanece dentro de las 100 consultas/día disponibles. Si el consumo real es mayor al esperado, ajustar ventana/frecuencia antes de cerrar Fase 1.

## Deploys siguientes

Una vez que el secreto ya existe:

```powershell
git pull
npm install
npm run deploy
```

`npm run deploy` ejecuta tests, build y migraciones remotas antes de publicar.

## Criterio de cierre

Fase 1 queda oficialmente cerrada cuando deploy + smoke + flujo Admin/Participante + bloqueo kickoff + Cron + cuota real estén verificados en producción.

La Liga queda validada cuando funcione en producción el ciclo completo `crear temporada → vincular 5 fechas → puntuar resultados definitivos → alta tardía sin retroactividad → acumular tabla → cerrar Liga`.
