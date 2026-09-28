# Seguridad de migraciones y publicación

Auditoría de 0007–0014 sobre el esquema versionado hasta 0006. No se consultó producción: no certifica ausencia de cambios manuales en la base real.

## Migraciones

- 0007–0013 crean tablas e índices nuevos. No copian ni actualizan datos, no requieren temporadas, usuarios ni clasificaciones precargadas. Las claves referenciadas existen en 0001/0006 y las restricciones se aplican a tablas nuevas vacías.
- 0014 crea una tabla con referencias existentes y agrega `members_json` a `competition_survival_results` (creada en 0010). `NOT NULL DEFAULT '[]' CHECK(json_valid(...))` admite filas previas y escrituras antiguas con columnas explícitas. No reconstruye ni elimina tablas.
- `[]` no reconstruye integrantes históricos de resultados previos a 0014. Si existieran, conservarlos y revisar su evidencia antes de usar ese snapshot; no inventar integrantes mediante un backfill automático.
- CASCADE/SET NULL/RESTRICT no se ejecutan por crear estas tablas. Sí afectan futuras eliminaciones físicas de padres: no borrar usuarios/temporadas/etapas para revertir la migración.
- Aplicar en orden, mediante el registro de Wrangler. No repetir SQL a mano ni agregar `IF NOT EXISTS` para ocultar diferencias de esquema. No editar migraciones ya aplicadas.

## Publicación

`npm run deploy` y `deploy:first`: tests → build → consulta de sólo lectura del registro remoto → publicación del Worker. **No aplican migraciones**. Faltantes, migraciones desconocidas, registro ausente, respuesta inválida o fallo de consulta bloquean la publicación. `deploy:first` mantiene el archivo de secretos sin imprimirlo.

El registro no comprueba modificaciones manuales ni hashes del SQL. Antes de una primera liberación, con autorización independiente para producción, comprobar esquema/foreign keys y conservar un punto de recuperación. `db:migrate:remote` es una operación independiente, nunca un paso automático de deploy. No ejecutar liberaciones concurrentes.

## Fallo parcial y recuperación

D1 y Worker no comparten una transacción. Separar comandos evita que **deploy** migre D1 y luego falle, pero no promete atomicidad entre una migración autorizada por separado y la publicación posterior. Estas migraciones son expansivas: el Worker anterior puede conservar las tablas/columnas que ya usaba. Invertir el orden expondría el Worker nuevo a tablas faltantes.

Si falla una migración, detenerse: Wrangler revierte la migración fallida, no las anteriores completadas. Revisar el registro y corregir la causa antes de reintentar las pendientes. No borrar tablas ni retroceder el registro.

Si falla la publicación después de una migración independiente, conservar esquema y datos; verificar qué versión está activa y reintentar el mismo artefacto revisado. No restaurar D1 automáticamente: se perderían escrituras posteriores. Un rollback de Worker no revierte D1; verificar compatibilidad y bindings antes de seleccionar una versión previa. Restaurar D1 requiere decisión explícita y revisión de las escrituras que se perderían.

Fuentes: [migraciones D1](https://developers.cloudflare.com/d1/reference/migrations/), [comandos D1](https://developers.cloudflare.com/d1/wrangler-commands/), [versiones del Worker](https://developers.cloudflare.com/workers/versions-and-deployments/).
