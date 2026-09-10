# ProdeTAFA

Nueva versión del Prode TAFA, reconstruida desde cero.

## Objetivo del MVP

Permitir que el administrador cree una fecha y seleccione partidos reales; que los participantes carguen y envíen sus pronósticos; que cada partido se bloquee automáticamente un minuto después del horario oficial; y que los resultados reales se obtengan desde un proveedor de fútbol para calcular los puntos automáticamente.

## Stack

- React + TypeScript + Vite
- Cloudflare Workers
- Cloudflare D1
- Cloudflare Vite Plugin
- PWA como objetivo de instalación en Android

La aplicación se desplegará como una única unidad en Cloudflare Workers: frontend estático + API Worker.

## Desarrollo

1. `npm install`
2. Crear una base D1 y reemplazar `REPLACE_WITH_D1_DATABASE_ID` en `wrangler.jsonc`.
3. `npm run db:migrate:local`
4. `npm run dev`

## Deploy

1. Aplicar migraciones remotas con `npm run db:migrate:remote`.
2. Ejecutar `npm run deploy`.

Ver `AGENTS.md` para las reglas funcionales que Codex debe respetar.
