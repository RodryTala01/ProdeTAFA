# ProdeTAFA

Nueva versión del Prode TAFA, reconstruida desde cero como aplicación permanente.

## Estado actual

La Fase 1 / MVP está funcionalmente muy avanzada y la Fase 2 ya comenzó con la preparación PWA.

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
- Tipo especial `PENALTIES_ONLY`, sin marcador: sólo se elige el ganador de la tanda.
- Sincronización automática de resultados mediante Cron Trigger cada 10 minutos durante ventanas relevantes.
- Sincronización manual desde el panel Admin.
- Puntaje automático e idempotente: pleno 3, parcial 1, error 0 y definición especial 1.
- Puntos provisionales cuando el proveedor informa un partido en vivo.
- Partidos anulados/suspendidos definitivos sin penalizar al participante.
- Ranking con desempates por puntos, plenos, parciales, errores y extras.
- Cierre de fecha y ranking final para participantes.
- Historial de fechas finalizadas para participantes.
- Corrección manual de resultados, edición excepcional de pronósticos y auditoría.
- GitHub Actions ejecutando `npm run build` en cada push.

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

## Base de datos

Aplicar migraciones remotas:

```bash
npm run db:migrate:remote
```

## Deploy

Antes del deploy público hay que configurar `FOOTBALL_API_KEY` como secreto del Worker y luego desplegar:

```bash
npx wrangler secret put FOOTBALL_API_KEY
npm run deploy
```

El administrador inicial ya fue creado en la base remota, por lo que el endpoint de setup inicial queda bloqueado.

## Próximos pasos

Ver `ROADMAP.md` para el checklist de cierre de Fase 1 y el alcance propuesto de Fase 2.

Ver `AGENTS.md` para las reglas funcionales que Codex debe respetar.
