# ProdeTAFA - checklist para cuando Rodrigo vuelva a la PC

Actualizado: 2026-09-11

## Reglas que no hay que cambiar

Los partidos cargados como `PENALTIES_ONLY` usan marcador de los 90 minutos para 3/1/0 y una elección de ganador de tanda. El +1 sólo existe si el partido efectivamente llega a penales y el equipo elegido gana la tanda.

Una Liga tiene 5 fechas. Los puntos de Liga entran únicamente cuando el partido queda definitivo; nunca entran provisionales. Un alta tardía empieza desde la primera fecha de Liga todavía no finalizada y conserva 0 en las anteriores.

## Estado del código antes de volver

El trabajo que puede validarse sin producción quedó cubierto por CI:

- scoring 3/1/0 y extra de penales;
- manual de penales puede indicar correctamente si hubo o no tanda;
- reset manual a API-Football limpia scores/resultados viejos hasta resincronizar;
- una sola fecha publicada a la vez;
- fechas publicadas/finalizadas inmutables en su lista de partidos;
- reset de contraseña de participantes no puede tocar cuentas admin;
- mutaciones API protegidas contra requests cross-site;
- migraciones locales `0001 + 0002 + 0003`;
- Liga de 5 fechas y altas tardías con `eligible_from_slot`;
- tabla de Liga sólo con resultados definitivos;
- PWA y navegación móvil;
- health/smoke test profundos.

## Primer paso al llegar a la PC

Si `npm run dev` estuviera abierto, frenarlo con `Ctrl + C`.

Después, dentro de `ProdeTAFA`:

```powershell
git pull
npm install
npm run deploy:first
```

`deploy:first` debe ejecutar automáticamente tests, build, todas las migraciones D1 remotas pendientes (`0002` y `0003` incluidas), deploy de Cloudflare y carga segura de `FOOTBALL_API_KEY` desde `.dev.vars`.

No correr esos pasos por separado salvo que estemos diagnosticando un fallo.

## Después del deploy

Copiar la URL `workers.dev` que devuelva Wrangler:

```powershell
$env:BASE_URL="https://prode-tafa.<subdominio>.workers.dev"
npm run smoke:prod
```

El smoke test debe validar:

- Worker saludable;
- tablas de Liga en D1;
- columna `league_participants.eligible_from_slot` de `0003`;
- como máximo una fecha `open`;
- frontend;
- manifest PWA + iconos 192/512 declarados;
- service worker `/sw.js`.

## Prueba real Fase 1

- Entrar como admin y participante.
- Crear/publicar una fecha de 12 partidos.
- Intentar publicar una segunda fecha mientras la primera está abierta: debe bloquearse.
- Probar autosave, enviar y reenviar.
- Confirmar bloqueo real en kickoff + 1 minuto.
- Probar un partido marcado Penales que NO llega a tanda: sólo 3/1/0.
- Probar uno que sí llega: puede sumar +1 por ganador de tanda.
- Desde corrección manual, comprobar ambos casos: hubo / no hubo penales.
- Probar `Volver a API-Football`: los puntos manuales deben desaparecer mientras espera el dato oficial.
- Confirmar que una fecha publicada no permita agregar/quitar partidos.
- Confirmar anulados, ranking, cierre, historial y revelado final.
- Confirmar Cron real y consumo de API-Football.

## Prueba real Fase 2 - Liga

1. Crear `Liga TAFA Prueba`.
2. Vincular 5 fechas y comprobar orden 1–5.
3. Confirmar que una fecha no pueda estar en dos Ligas.
4. Ver tabla inicial con participantes en 0.
5. Con Fecha 1 cerrada, crear/reactivar un participante: debe quedar `eligible_from_slot = 2` conceptualmente y no sumar nada de Fecha 1 aunque existieran datos previos.
6. Si entra mientras la fecha actual sigue abierta, debe poder contar desde esa fecha.
7. Dejar a alguien sin presentar una fecha y comprobar 0.
8. Finalizar un partido y confirmar que recién entonces cambie la Liga.
9. Confirmar que un resultado provisional no entre.
10. Cerrar las cinco fechas y finalizar la Liga.
11. Confirmar que una Liga cerrada siga visible como histórico y no permita cambiar fechas.

## PWA / Android

En la URL HTTPS real abrir desde Chrome Android, comprobar que aparece instalación, instalar en modo standalone y probar `Pronósticos | Liga | Historial`, incluyendo safe areas.

El manifest ya declara SVG 192x192 y 512x512. PNG/maskable quedan como mejora de compatibilidad sólo si el dispositivo o auditoría los exige.

## Punto exacto donde retomamos

Deploy → smoke test → prueba Fase 1 → prueba Liga. Cualquier problema real se corrige antes de empezar Copas.

No empezar todavía tabla histórica general, palmarés, perfiles avanzados, estadísticas divertidas ni WhatsApp.
