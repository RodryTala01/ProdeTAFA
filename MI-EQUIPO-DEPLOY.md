# Mi Equipo — publicación segura

Mi Equipo introduce **una única tabla aditiva**: `team_profiles` (migración `0016_team_profiles.sql`). No cambia datos de participantes, pronósticos, puntuaciones, ligas ni copas.

## Antes de fusionar el PR

1. Revisar que CI y E2E de la rama estén verdes.
2. Con la rama `feat/mi-equipo-a1-historiales` en un entorno que ya tenga Wrangler autenticado y conectado a la cuenta correcta, conservar el punto de recuperación que usa el administrador de D1.
3. Aplicar de forma **separada y autorizada**: `npm run db:migrate:remote`.
4. Confirmar que Wrangler registra `0016_team_profiles.sql` como aplicada y que no quedan migraciones pendientes.
5. Solo entonces fusionar el PR #40 a `main`. El workflow de producción repetirá tests/E2E, verificará **en modo lectura** el registro remoto y publicará en Cloudflare.

No incorporar `db:migrate:remote` al workflow `deploy`. Si la migración falla, detenerse y no borrar tablas ni editar manualmente el registro `d1_migrations`.

## Qué se verá

- Mi Club continúa funcionando y Mi Equipo es una pestaña pública separada.
- El administrador edita identidad desde **Administración → Participantes → Mi Equipo**.
- El escudo debe estar previamente publicado como recurso interno `/teams/archivo.png` o `/participants/archivo.png`. La interfaz no permite subir imágenes directamente.
- Hasta que se asigne un nombre oficial al club, se mostrará `Equipo de [participante]`, sin inventar un palmarés.
- El historial agrupa **solo cruces directos confirmados** y el botón + expande la fila con detalles.
- General/IFFHS indican mejor ranking por temporada cuando la evidencia permite calcularlo; para períodos sin vinculación histórica completa se muestra «—».
