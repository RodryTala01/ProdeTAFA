# ProdeTAFA — Puesta en producción

Este documento cubre la puesta en producción del MVP y de la estructura de Liga agregada en Fase 2.

## Antes del primer deploy

La base D1 remota ya está configurada en `wrangler.jsonc`. `FOOTBALL_API_KEY` está declarado como secreto obligatorio y nunca debe subirse al repositorio.

En la PC de desarrollo debe existir `.dev.vars` con:

```text
FOOTBALL_API_KEY=tu_clave_real
```

`.dev.vars` está ignorado por Git.

## Actualizar la base remota

Antes de desplegar el código actual, aplicar las migraciones pendientes sobre D1 remoto:

```powershell
git pull
npm install
npm run db:migrate:remote
```

Wrangler debe aplicar `0002_league_seasons.sql` además de cualquier migración futura todavía pendiente. No desplegar la interfaz de Liga contra una base que todavía no tenga estas tablas.

## Primer deploy

Desde PowerShell, dentro de `ProdeTAFA`:

```powershell
npm test
npm run build
npm run deploy:first
```

`deploy:first` ejecuta tests, build y luego `wrangler deploy --secrets-file .dev.vars`. Esto sube el código y el secreto de API-Football en la misma operación.

Al finalizar, Wrangler debe mostrar la URL `https://prode-tafa.<subdominio>.workers.dev`.

## Smoke test

Copiar la URL de Workers y ejecutar:

```powershell
$env:BASE_URL="https://prode-tafa.<subdominio>.workers.dev"
npm run smoke:prod
```

El smoke test comprueba:

- `/api/health`
- frontend principal
- manifest PWA
- service worker

Debe terminar con `Smoke test OK`.

## Verificaciones Cloudflare

```powershell
npx wrangler secret list
npx wrangler deployments list
```

En `secret list` debe figurar `FOOTBALL_API_KEY` sin mostrar su valor.

En Cloudflare Dashboard revisar además que el Worker `prode-tafa` tenga:

- D1 binding `DB` apuntando a `prode-tafa`.
- Cron Trigger `*/10 * * * *`.
- `FOOTBALL_API_KEY` como Secret.

## Prueba end-to-end de Fase 1

Usar una fecha real o de prueba con 12 partidos y verificar, en este orden:

1. Admin puede abrir la fecha y ver los 12 partidos.
2. Participante puede iniciar sesión.
3. Cargar resultados normales y comprobar autosave.
4. En un partido marcado `PENALTIES_ONLY`, cargar marcador de 90 minutos y ganador de la tanda.
5. Enviar la fecha completa.
6. Modificar un partido todavía abierto y volver a enviar.
7. Confirmar que un partido se bloquea en kickoff + 1 minuto.
8. Actualizar resultados desde Admin.
9. Confirmar 3 puntos por pleno, 1 por signo y 0 por error.
10. Confirmar +1 por ganador de penales cuando el partido marcado para penales efectivamente llega a la tanda.
11. Confirmar que un partido anulado vale 0 y no cuenta como error.
12. Confirmar ranking y desempates.
13. Confirmar que no se puede cerrar la fecha con partidos pendientes.
14. Cerrar la fecha cuando todos estén resueltos.
15. Confirmar ranking final, historial y revelado de pronósticos enviados.
16. Probar una corrección manual de resultado y verificar recálculo.
17. Probar una edición excepcional de pronóstico y verificar auditoría.
18. Confirmar que una fecha publicada no permite agregar ni quitar partidos, ni siquiera llamando a la API directamente.

## Prueba inicial de Liga — Fase 2

Después de validar una fecha individual, comprobar la Liga:

1. Crear una temporada desde Admin → Liga.
2. Vincular cinco fechas distintas en orden 1 a 5.
3. Verificar que una fecha no pueda vincularse a dos temporadas.
4. Verificar que la tabla arranque con todos los participantes activos en 0.
5. Finalizar un partido de una fecha vinculada y confirmar que la tabla de Liga incorpora esos puntos definitivos.
6. Confirmar que puntos provisionales de partidos en juego no entren en la tabla.
7. Crear o reactivar un participante con la Liga abierta y comprobar que aparezca con 0 puntos previos.
8. Dejar a un participante sin enviar una fecha y comprobar que esa fecha le aporte 0.
9. Confirmar los desempates: puntos, plenos, parciales, menos errores y extras.
10. Confirmar que la Liga no pueda finalizar hasta tener exactamente cinco fechas cerradas.
11. Finalizar las cinco fechas y cerrar la Liga.
12. Confirmar que una Liga cerrada siga visible como histórico y ya no permita cambiar sus fechas.

## Cron y cuota de API-Football

Durante una jornada con partidos:

- Verificar que resultados cambien sin pulsar manualmente `Actualizar resultados`.
- Revisar el consumo en API-Football.
- El Cron corre cada 10 minutos, pero el Worker sólo consulta días con partidos próximos o en juego.
- Si el consumo resulta mayor al esperado, ajustar la ventana/frecuencia antes de dar Fase 1 por cerrada.

## Deploys siguientes

Una vez que el secreto ya existe en el Worker:

```powershell
git pull
npm install
npm run db:migrate:remote
npm run deploy
```

`npm run deploy` ejecuta tests y build antes de publicar. El comando de migración debe ejecutarse antes cuando existan migraciones nuevas.

## Criterio para cerrar Fase 1

Fase 1 se considera cerrada cuando:

- tests automáticos están verdes;
- migraciones remotas están al día;
- deploy a `workers.dev` funciona;
- smoke test funciona;
- flujo end-to-end funciona con Admin + Participante;
- Cron sincroniza resultados en producción;
- consumo de API-Football se mantiene dentro del plan disponible.
