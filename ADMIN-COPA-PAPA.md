# Copa Papa Admin

Acceso: **Admin → Competiciones → temporada → Administrar Copa Papa**. El encabezado usa el nombre homenaje editable desde **Configuración general**; la identidad permanece `COPA_PAPA`.

## Uso

- **Propuesta**: temporada anterior encontrada/no encontrada, cantidad de activos, espejo mejor A contra peor B, posiciones históricas, no emparejados y referencia de tamaño/byes del backend. La sugerencia no asigna vacantes ni decide por Admin.
- **Llave inicial**: cargar manualmente o usar el espejo como borrador. Incorporar los no emparejados, agregar/quitar cruces, seleccionar rivales o Libre (bye). El orden de las tarjetas es el orden deportivo de avance. Validación de todos exactamente una vez, sin duplicados ni desconocidos.
- Seleccionar etapa eliminatoria y Fecha NORMAL vinculada. Confirmar mediante el endpoint específico. Una llave guardada puede corregirse con motivo mientras siga sin publicación, inicio, resultados ni avance. Conserva etapa/Fecha originales; auditoría conserva antes y después. Los byes calculados automáticamente no cuentan como actividad por sí solos.
- **Rondas**: seleccionar origen con ganadores confirmados y destino posterior vacío. El backend empareja ganadores 1–2, 3–4, etc.; no hay sorteo nuevo.
- **Final y tercer puesto**: seleccionar semifinales de dos encuentros confirmados. Crear Final en una etapa vacía y luego seleccionar otra etapa para tercer puesto. Pueden compartir Fecha real con vínculos independientes. El tercero usa los dos perdedores, no permite una semifinal con bye sin segundo perdedor.
- CupEncounter muestra puntajes, ganador, confirmación y TAFA. Los pases libres aparecen explícitamente. No se ofrece reconstrucción de cruces ni corrección genérica de ganador.

Las etapas y vínculos se crean con Configuración general existente. Tras crear una ronda, refrescar puntajes y confirmar sus ganadores antes de continuar. No se permite duplicar el avance desde el mismo origen, ni continuar después de una final de un encuentro.

## Cambios

- `src/AdminCupPapa.tsx`: UI en cuatro secciones y componentes para propuesta, parejas y destino.
- `src/papa-admin.ts`: contrato de datos, validaciones de formulario y carga de etapas mediante lectura/refresco de knockout.
- `src/AdminCompetitions.tsx`: integración.
- `worker/competition-papa.ts`: se conserva propuesta y progresión; se agrega la carencia de corrección inicial al POST existente con motivo/auditoría, estado inicial al GET de propuesta, bloqueos de cierre/publicación y avance duplicado. Reemplazo de encuentros iniciales y auditoría en un batch. No hay endpoints nuevos ni migraciones.
- `tests/papa-admin-ui.test.ts`: renderizado y validaciones, byes, ganadores/perdedores, carga de endpoints.
- `tests/papa-admin-functional.test.ts`: SQLite existente ampliado para corrección, auditoría, conservación ante errores, bloqueos, final y avance repetido.

## Endpoints existentes utilizados

- GET `/api/competition-engine/competitions/:id/papa/seeding-proposal` (incluye `initial` con pares, etapa, vínculo y posibilidad de edición).
- POST `/api/admin/competition-engine/competitions/:id/papa/initial-bracket` (`reason` obligatorio al corregir).
- POST `/api/admin/competition-engine/stages/:id/papa/next-round`.
- POST `/api/admin/competition-engine/stages/:id/papa/third-place`.
- GET de knockout y operaciones de ganador/TAFA compartidas mediante CupEncounter.

Sin deploy, merge a main ni D1 remota. No se modifica el scoring ni la estructura deportiva de otras Copas.
