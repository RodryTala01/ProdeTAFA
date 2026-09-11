# ProdeTAFA - checklist para cuando Rodrigo vuelva a la PC

Actualizado: 2026-09-11

## Regla importante confirmada

Los partidos cargados como `PENALTIES_ONLY` usan:

- marcador de los 90 minutos para puntaje base 3 / 1 / 0;
- elección del ganador de la tanda;
- +1 punto extra si acierta quién gana por penales.

No volver a simplificar este tipo a solo ganador de penales.

## Estado antes de volver

El desarrollo que puede hacerse sin entorno real quedó cubierto y validado por CI:

- scoring y reglas de penales;
- integridad de fechas publicadas;
- migraciones D1 locales `0001 + 0002`;
- tests de esquema de Liga;
- build TypeScript/Vite;
- Liga de 5 fechas;
- altas tardías;
- tabla sólo con puntos definitivos;
- PWA base y navegación móvil;
- smoke test profundo de producción.

## Primer paso al llegar a la PC

Si `npm run dev` estuviera abierto, frenarlo con `Ctrl + C`.

Después, desde la carpeta `ProdeTAFA`:

```powershell
git pull
npm install
npm run deploy:first
```

`deploy:first` ya hace automáticamente:

1. tests;
2. build;
3. migraciones pendientes sobre D1 remota, incluida `0002_league_seasons.sql`;
4. deploy a Cloudflare;
5. carga segura de `FOOTBALL_API_KEY` desde `.dev.vars` para el primer deploy.

No ejecutar migraciones, tests o build por separado salvo que estemos diagnosticando un error.

## Después del deploy

Copiar la URL `workers.dev` que devuelva Wrangler y ejecutar:

```powershell
$env:BASE_URL="https://prode-tafa.<subdominio>.workers.dev"
npm run smoke:prod
```

El smoke test debe validar:

- Worker saludable;
- esquema de Liga presente en D1 remota;
- frontend;
- manifest PWA;
- iconos 192x192 y 512x512 declarados;
- service worker `/sw.js`.

## Prueba Fase 1

- Entrar como admin y participante.
- Crear/publicar o usar una fecha de prueba de 12 partidos.
- Probar autosave, enviar y reenviar.
- Probar marcador 90' + ganador de tanda en `PENALTIES_ONLY`.
- Confirmar bloqueo real en kickoff + 1 minuto.
- Confirmar que una fecha publicada no permita agregar/quitar partidos.
- Confirmar resultados, 3/1/0, +1 penales, anulados y ranking.
- Confirmar cierre de fecha, historial y revelado final.
- Probar corrección manual y auditoría.
- Confirmar Cron real y consumo de API-Football.

## Prueba Fase 2 - Liga

Decisiones confirmadas:

- temporada creada aparte y luego se vinculan fechas;
- exactamente 5 fechas;
- no presentado = 0;
- alta a mitad de Liga permitida con 0 previo;
- tabla cambia sólo cuando termina cada partido;
- nunca entran puntos provisionales;
- desempate: puntos, plenos, parciales, menos errores, extras.

Prueba:

1. Crear `Liga TAFA Prueba`.
2. Vincular 5 fechas y comprobar orden 1–5.
3. Confirmar que una fecha no pueda estar en dos Ligas.
4. Ver tabla inicial con participantes en 0.
5. Crear/reactivar un participante a mitad y comprobar 0 retroactivo.
6. Dejar a alguien sin presentar una fecha y comprobar 0.
7. Finalizar un partido y comprobar que recién entonces cambie la Liga.
8. Confirmar que un resultado provisional no entre.
9. Cerrar las cinco fechas.
10. Finalizar Liga y comprobar que sus fechas ya no puedan cambiarse.
11. Abrir una Liga finalizada desde el histórico.

## PWA / Android

En la URL HTTPS real:

- abrir desde Chrome en Android;
- confirmar que aparece la opción/banner de instalación;
- instalar y verificar modo standalone;
- probar la barra inferior `Pronósticos | Liga | Historial` y safe areas.

El manifest ya declara SVG 192x192 y 512x512. Como mejora de compatibilidad, queda pendiente generar PNG 192x192 y 512x512/maskable si el dispositivo o auditoría los exige. Esto requiere una vía capaz de subir binarios (PC/Codex u otra herramienta), no el conector de texto actual.

## Punto exacto donde retomamos

Si deploy + smoke están verdes, hacemos la prueba real de Fase 1 y Liga. Los problemas que aparezcan ahí se corrigen antes de avanzar a Copas.

No empezar todavía tabla histórica general, palmarés, perfiles avanzados, estadísticas divertidas ni WhatsApp: quedaron deliberadamente para fases posteriores.
