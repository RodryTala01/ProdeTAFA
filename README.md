# ProdeTAFA

Nueva versión del Prode TAFA, reconstruida desde cero como aplicación permanente.

## Estado actual

La Fase 1 / MVP está funcionalmente completa a nivel código y pendiente de validación final en producción. La Fase 2 ya comenzó con la preparación PWA.

### Núcleo implementado

- React + TypeScript + Vite.
- Cloudflare Worker para frontend + API.
- Cloudflare D1 remota.
- Configuración inicial del primer administrador desde la web.
- Login por teléfono + contraseña.
- Contraseñas con hash PBKDF2 y sesiones mediante cookie HttpOnly.
- Alta, restablecimiento de contraseña, desactivación y reactivación de participantes.
- Creación de fechas del Prode.
- Búsqueda de partidos reales por rango semanal mediante API-Football.
- Selección de 12 partidos por fecha.
- Equipos, escudos, competición, kickoff y estado obtenidos del proveedor.
- Publicación de fechas.
- Pronósticos con autosave y envío explícito.
- Bloqueo individual en kickoff + 1 minuto validado en backend.
- Tipo especial `PENALTIES_ONLY`: se pronostica el marcador de los 90 minutos y además quién gana la tanda.
- Puntaje 3/1/0 sobre los 90 minutos y +1 si corresponde y se acierta el ganador por penales.
- Sincronización automática de resultados mediante Cron Trigger cada 10 minutos durante ventanas relevantes.
- Sincronización manual desde el panel Admin.
- Puntaje automático e idempotente.
- Puntos provisionales cuando el proveedor informa un partido en vivo.
- Partidos anulados/suspendidos definitivos sin penalizar al participante.
- Ranking con desempates por puntos, plenos, parciales, errores y extras.
- Cierre de fecha y ranking final para participantes.
- Historial de fechas finalizadas para participantes.
- Revelado de pronósticos enviados una vez cerrada la fecha.
- Corrección manual de resultados, edición excepcional de pronósticos y auditoría.
- Tests automáticos para las reglas críticas de scoring.
- GitHub Actions ejecutando tests + build en cada push.
- Smoke test preparado para validar producción.

### Fase 2 iniciada

- Manifest PWA.
- Service worker de assets estáticos, sin cachear la API.
- Metadatos para instalación móvil.
- Ícono SVG base de Prode TAFA.

## Objetivo del MVP

Permitir que el administrador cree una fecha y seleccione partidos reales; que los participantes carguen y envíen sus pronósticos; que cada partido se bloquee automáticamente un minuto después del horario oficial; y que los resultados reales se obtengan desde un proveedor de fútbol para calcular los puntos automáticamente.

## Stack

- React + TypeScript + Vite
- Cloudflare Workers
- Cloudflare D1
- Cloudflare Vite Plugin
- API-Football detrás del backend
- PWA para instalación móvil

La aplicación se despliega como una única unidad en Cloudflare Workers: frontend estático + API Worker.

## Desarrollo

```bash
npm install
npm run dev
```

La configuración actual conecta D1 localmente contra la base remota del proyecto.

## Tests y build

```bash
npm test
npm run build
```

Los tests unitarios usan una configuración separada de Vitest para no conectarse a Cloudflare ni a la D1 remota.

## Base de datos

Aplicar migraciones remotas:

```bash
npm run db:migrate:remote
```

## Deploy

`FOOTBALL_API_KEY` está declarada como secreto obligatorio del Worker.

Para el primer deploy, con la clave ya presente en `.dev.vars`:

```bash
npm run deploy:first
```

Ese comando ejecuta tests + build y despliega usando `.dev.vars` como archivo de secretos. El valor no se guarda en Git.

Para deploys posteriores:

```bash
npm run deploy
```

Después del primer deploy se puede validar la URL pública con:

```bash
BASE_URL=https://prode-tafa.<subdominio>.workers.dev npm run smoke:prod
```

En PowerShell, definir primero `$env:BASE_URL`.

El administrador inicial ya fue creado en la base remota, por lo que el endpoint de setup inicial queda bloqueado.

## Próximos pasos

Ver `PRODUCTION.md` para el procedimiento de cierre de Fase 1 y la prueba end-to-end.

Ver `ROADMAP.md` para el estado de Fase 1 y el alcance propuesto de Fase 2.

Ver `AGENTS.md` para las reglas funcionales que Codex debe respetar.
