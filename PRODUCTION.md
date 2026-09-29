# ProdeTAFA — Producción

Este documento describe el flujo productivo vigente para ProdeTAFA/T32.

## Regla principal

Las migraciones D1 y el deploy del Worker son operaciones separadas.

- `npm run db:migrate:remote` aplica migraciones remotas y modifica D1.
- `npm run deploy` y `npm run deploy:first` **no aplican migraciones**.
- Antes de publicar, ambos deploys ejecutan tests, build y un preflight read-only del registro `d1_migrations`.
- Si hay una migración pendiente o desconocida, el deploy se bloquea.

No ejecutar migraciones o deploys productivos sin autorización explícita.

## Configuración

La D1 remota está declarada en `wrangler.jsonc` mediante el binding `DB`.

El Worker requiere el secreto:

```text
FOOTBALL_API_KEY
```

El Cron esperado es:

```text
*/10 * * * *
```

Para desarrollo local, usar `.dev.vars`. Nunca subir secretos al repositorio.

## Preflight read-only de Cloudflare

Con una sesión Wrangler autenticada:

```powershell
npm run check:prod:config
```

El comando no modifica Cloudflare. Comprueba:

- que `FOOTBALL_API_KEY` esté declarado como secreto obligatorio en `wrangler.jsonc`;
- que Wrangler informe `FOOTBALL_API_KEY` entre los secretos remotos;
- que el Cron `*/10 * * * *` esté declarado en la configuración versionada;
- que exista al menos un deployment remoto visible.

La existencia efectiva del Cron remoto debe confirmarse también en Cloudflare Dashboard:

`Workers & Pages → prode-tafa → Settings/Triggers → Cron Triggers`.

## Migraciones

Antes de aplicar migraciones remotas:

1. revisar el SQL pendiente;
2. confirmar que el Worker actualmente publicado tolera el esquema expandido;
3. ejecutar las migraciones como operación independiente;
4. si una migración falla, detenerse en esa migración;
5. no ejecutar SQL manual para saltar el ledger;
6. no editar migraciones ya aplicadas.

Comando autorizado para aplicar las pendientes:

```powershell
npm run db:migrate:remote
```

Después verificar el registro remoto. El deploy también volverá a comprobarlo de forma read-only.

Consultar `DEPLOY-SAFETY.md` para recuperación ante fallos parciales.

## Deploy

### Primer deploy / carga inicial del secreto

Sólo cuando corresponda inicializar el secreto desde `.dev.vars`:

```powershell
git pull
npm install
npm run deploy:first
```

### Deploys normales

```powershell
git pull
npm install
npm run deploy
```

El flujo de deploy es:

1. tests;
2. build;
3. consulta read-only de `d1_migrations`;
4. publicación del Worker.

No hay migraciones dentro del comando de deploy.

## Smoke de producción

Después de publicar:

```powershell
$env:BASE_URL="https://prode-tafa.<subdominio>.workers.dev"
npm run smoke:prod
```

El smoke es read-only y comprueba:

- `/api/health`;
- `/api/health/deep`;
- todas las tablas versionadas desde 0001 hasta 0014;
- columnas agregadas por migraciones;
- triggers versionados de historial y pronóstico oficial;
- presencia de `0014_duos_admin.sql` en el ledger D1;
- que no existan dos Fechas `open` simultáneamente;
- que producción ya tenga administrador inicial;
- que las rutas principales de T32 existan y rechacen acceso anónimo:
  - Admin Competition Engine;
  - contexto actual del participante;
  - IFFHS;
  - Liga A;
  - contextos deportivos por Fecha;
- frontend principal;
- manifest PWA;
- service worker.

El smoke no crea usuarios, Fechas, temporadas ni resultados.

Debe terminar con:

```text
Smoke test T32 OK
```

## Health profundo

`GET /api/health/deep` debe informar:

- `schemaReady: true`;
- `leagueSchemaReady: true`;
- `competitionEngineSchemaReady: true`;
- `officialPredictionsReady: true`;
- `triggerSchemaReady: true`;
- `migrationLedgerReady: true`;
- `singleOpenRoundReady: true`;
- `missingTables: []`;
- `missingColumns: []`;
- `missingTriggers: []`.

La cobertura de esquema está ligada a las migraciones mediante tests. Si se agrega una migración nueva, CI obliga a actualizar el contrato de health.

## E2E T32 → T33

El escenario completo vive en `scripts/e2e-t32-local.mjs`.

CI lo ejecuta en una D1 local aislada mediante:

```powershell
npm run test:e2e:ci
```

El escenario valida, entre otros puntos:

- 32 participantes;
- Liga A y Liga B;
- 18 Fechas;
- un snapshot oficial de 12 pronósticos por participante/Fecha;
- Copa A y Copa B;
- Copa Total;
- Copa Dúos;
- Copa Campeones;
- Copa Papa;
- Promoción;
- desempates TAFA;
- resultados finales;
- IFFHS;
- transición T32 → T33;
- contextos de competición del participante.

Nunca apuntar este escenario E2E a producción.

## Prueba funcional en producción

Las pruebas que escriben datos reales deben ser deliberadas y mínimas. No reutilizar el E2E local contra producción.

Para una jornada real comprobar:

1. Admin puede abrir una Fecha válida de 12 partidos.
2. Participante inicia sesión y guarda pronósticos.
3. El autosave no pierde cambios.
4. El envío genera el snapshot oficial.
5. El bloqueo de kickoff impide modificaciones tardías.
6. La sincronización de resultados funciona con API-Football.
7. El Cron actualiza sin intervención manual.
8. El scoring 3/1/0 y el extra por penales son correctos.
9. Una Fecha no puede cerrarse con resultados pendientes.
10. Rankings, historial y contextos de competición se muestran correctamente.

## API-Football y Cron

Durante una jornada real:

- verificar que `FOOTBALL_API_KEY` siga disponible;
- comprobar que el Cron corre cada 10 minutos;
- observar consumo real de API-Football;
- confirmar que la sincronización automática actualiza resultados;
- si el consumo supera la cuota prevista, ajustar frecuencia/ventana antes de depender del Cron en una jornada completa.

## Staging

Las pruebas destructivas o el E2E completo remoto deben ejecutarse en un Worker + D1 de staging, nunca sobre la D1 productiva.

Crear staging requiere acceso autenticado a Cloudflare y debe mantener:

- D1 separada;
- nombre de Worker separado;
- secretos separados;
- Cron deshabilitado o explícitamente controlado;
- ninguna escritura hacia producción.

## Criterio de cierre T32

T32 puede considerarse cerrada cuando:

- migraciones remotas están completas;
- Worker productivo está publicado;
- tests y build pasan;
- E2E T32 → T33 pasa en CI aislada;
- smoke T32 pasa contra producción;
- preflight read-only de Cloudflare pasa;
- Cron remoto está confirmado;
- al menos una sincronización real de API-Football fue observada correctamente;
- no hay errores funcionales pendientes de severidad alta.
