# ProdeTAFA — Puesta en producción

Este documento cubre el cierre de la Fase 1 en Cloudflare Workers.

## Antes del primer deploy

La base D1 remota ya está configurada en `wrangler.jsonc`. `FOOTBALL_API_KEY` está declarado como secreto obligatorio y nunca debe subirse al repositorio.

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
npm run deploy
```

`npm run deploy` ejecuta tests y build antes de publicar.

## Criterio para cerrar Fase 1

Fase 1 se considera cerrada cuando:

- tests automáticos están verdes;
- deploy a `workers.dev` funciona;
- smoke test funciona;
- flujo end-to-end funciona con Admin + Participante;
- Cron sincroniza resultados en producción;
- consumo de API-Football se mantiene dentro del plan disponible.
