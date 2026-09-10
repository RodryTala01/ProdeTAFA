# ProdeTAFA

Nueva versión del Prode TAFA, reconstruida desde cero.

## Estado actual

Infraestructura y primer módulo funcional:

- React + TypeScript + Vite.
- Cloudflare Worker para frontend + API.
- Cloudflare D1 remota.
- Configuración inicial del primer administrador desde la propia web.
- Login por teléfono + contraseña.
- Sesiones seguras mediante cookie HttpOnly.
- Alta de participantes desde el panel Admin.
- Restablecimiento de contraseña por el administrador.
- Registro de auditoría para altas y cambios de contraseña.

El siguiente módulo es Fechas + selección de partidos reales + pronósticos.

## Objetivo del MVP

Permitir que el administrador cree una fecha y seleccione partidos reales; que los participantes carguen y envíen sus pronósticos; que cada partido se bloquee automáticamente un minuto después del horario oficial; y que los resultados reales se obtengan desde un proveedor de fútbol para calcular los puntos automáticamente.

## Stack

- React + TypeScript + Vite
- Cloudflare Workers
- Cloudflare D1
- Cloudflare Vite Plugin
- PWA como objetivo de instalación en Android

La aplicación se despliega como una única unidad en Cloudflare Workers: frontend estático + API Worker.

## Desarrollo

```bash
npm install
npm run dev
```

La configuración actual conecta D1 localmente contra la base remota del proyecto.

## Base de datos

Aplicar migraciones remotas:

```bash
npm run db:migrate:remote
```

## Deploy

```bash
npm run deploy
```

Antes del primer deploy público conviene abrir la aplicación localmente y crear el administrador inicial. Una vez que existe un administrador, el endpoint de configuración inicial queda deshabilitado.

Ver `AGENTS.md` para las reglas funcionales que Codex debe respetar.
