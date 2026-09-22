# Administración de Copa Total

Implementada en `dev/t32-competition-engine`, conservando Copa A/B y Liga legacy. No requiere migración nueva. D1 local tiene todas las migraciones existentes aplicadas.

## Probar el escenario preparado

1. Abrir http://127.0.0.1:5174/. Admin local: teléfono `0000000001`, contraseña ficticia `Admin123!`.
2. Entrar a **Competiciones**, elegir **T33 · Prueba local Copa A/B**, y tocar **Administrar Copa Total**.
3. **Resumen** muestra los 32 participantes ficticios, etapas y vínculos. **Grupos** tiene ocho grupos de cuatro; se probaron guardado manual y sorteo automático auditados. La configuración final es automática, con semilla visible. Como ya tiene fixture, no permite reemplazar grupos.
4. **Mini-fechas** muestra dos Fechas de 12 partidos y seis bloques de cuatro. Abrir cada bloque para ver partidos reales y enfrentamientos de grupo. Hay 96 enfrentamientos en total (12 por grupo).
5. **Tabla** muestra ocho tablas finales empatadas: los partidos ficticios fueron anulados para probar sin API ni datos reales. Todos comparten posición deportiva. No hay desempate por nombre.
6. **Clasificación** muestra el snapshot confirmado de 16 seleccionados manualmente con motivo. La asistencia detectó previamente el empate y exigió decisión Admin.
7. **Octavos**, **Cuartos**, **Semifinal** muestran ocho, cuatro y dos cruces. Para recorrer todo el flujo técnico se asignaron ganadores ficticios mediante correcciones excepcionales auditadas; no representan resultados deportivos reales.
8. **Final / 3.º puesto** muestra dos cruces independientes pendientes: ganadores y perdedores de Semifinal respectivamente. Comparten la Fecha futura de Final mediante vínculos distintos. No se publicó esa Fecha ni se activó T33.
9. Para consultar puntajes usar **Actualizar puntajes**. Un ganador deportivo requiere confirmación. Ante igualdad usar **Administrar desempate TAFA**, vincular una Fecha posterior y evaluar. Las correcciones excepcionales exigen motivo.

Este escenario está avanzado para inspección. Para recorrer el armado desde cero se necesita una edición sin fixture: no se debe intentar regenerar esta prueba ni borrar su historia. Copa A/B y la configuración previa de T32 se conservaron.

## Flujo manual desde una edición nueva

- Crear una etapa de grupos con formato ROUND_ROBIN_GROUPS en **Configuración general, etapas y Fechas**. Crear etapas KNOCKOUT en orden: Octavos, Cuartos, Semifinal, Final, Tercer puesto. Se usan los IDs de API, no IDs fijos.
- En **Grupos**, elegir **Armar manualmente**, ajustar cantidad/tamaños entre 3 y 5, asignar todos los elegibles una vez y guardar. Sólo son elegibles participantes activos de las divisiones de esa temporada.
- Vincular exactamente dos Fechas Copa con 12 partidos cada una a grupos; vincular las Fechas de eliminatorias a sus etapas.
- En **Mini-fechas**, generar los seis segmentos, revisar grupos y generar fixture. Los match_id persistidos determinan cada bloque aunque luego cambien horarios.
- Al completar grupos, revisar clasificación por posiciones/comodines. Si el corte queda empatado, seleccionar manualmente; también existe selección excepcional completa con motivo. Revisar la propuesta y después confirmar el snapshot.
- En cada eliminatoria, consultar clasificados, armar pares manuales y guardar. Octavos usa el snapshot, Cuartos/Semifinal los ganadores confirmados. Se exige todo el pool sin duplicados ni restricciones inventadas.
- Reemplazar cruces sólo antes de publicación/inicio y sin actividad, indicando motivo. Confirmar ganadores antes de avanzar. Final requiere dos ganadores y tercer puesto dos perdedores confirmados de Semifinal.

## Flujo automático opcional

- En Grupos, revisar ranking IFFHS previo, bombos, tamaños y campeón vigente elegible. Elegir **Sorteo automático** y ejecutar: el campeón ocupa A1; quedan semilla y resultado auditados. En la prueba local no hay historial IFFHS importado.
- Clasificación asistida permite posiciones directas, posición/cantidad de comodines y tamaño objetivo. Compara PTS/DG/GF/PG sin resolver arbitrariamente empates en el corte. Se muestra propuesta antes de confirmar.
- Octavos/Cuartos/Semifinal ofrecen sorteo del mismo pool validado que el modo manual. Final y tercer puesto usan los dos participantes que corresponden; no incorporan nuevos criterios deportivos.

## Endpoints

Prefijo Admin: `/api/admin/competition-engine`.

Reutilizados: configuración general de competiciones/etapas y vínculos; `GET /api/competition-engine/iffhs/ranking`; `GET /api/competition-engine/stages/:id/total/groups` (tablas), `/total/qualifiers`, `/knockout`; `GET /api/admin/competition-engine/stages/:id/total/segments`; `PUT /encounters/:id/winner`; `POST /encounters/:id/tiebreak`, `/tiebreaks/:id/rounds`, `/tiebreaks/:id/refresh`.

Nuevos:

- `GET /stages/:id/total/groups`: contexto Admin, elegibles, campeón, asignaciones, vínculos y última auditoría.
- `POST /stages/:id/total/groups/draw`: sorteo opcional por bombos IFFHS calculados por servidor, tamaños adaptables y campeón A1.
- `POST /stages/:id/total/qualify/preview`: mismas validaciones de clasificación sin persistir.
- `GET /stages/:id/total-progression/{qualified|winners|third-place}`: consulta de pool validado para etapa y vínculo destino.

Ampliados conservando compatibilidad:

- `POST /stages/:id/total/groups`: todos los activos de la temporada una vez, grupos 3–5, modo MANUAL explícito y reemplazo/auditoría en batch.
- `POST /stages/:id/total/segments`: dos Fechas de 12, seis segmentos y auditoría atómicos; IDs congelados.
- `POST /stages/:id/total/fixture`: fixture y auditoría atómicos; bloqueo de regeneración y temporadas cerradas.
- `POST /stages/:id/total/qualify`: snapshot auditado, selección manual/comodines y cortes empatados; bloquea reemplazo tras usar los clasificados.
- `POST /stages/:id/total-progression/{qualified|winners|third-place}`: pares manuales o sorteo, exactitud del pool, confirmaciones vigentes, orden de etapas y correcciones justificadas antes de actividad.
- `PUT /stages/:id/knockout` remite también Copa Total a progresión para impedir eludir elegibilidad. Excepciones de ganador Total requieren motivo; desempates se resuelven por el motor TAFA.

## Archivos del bloque

- UI nueva: `src/AdminCupTotal.tsx`, `src/TotalQualification.tsx`, `src/TotalKnockout.tsx`.
- Componente compartido extraído: `src/CupEncounter.tsx`, reutilizado desde `src/CupAbKnockout.tsx` y Copa Total; conserva confirmaciones y TAFA.
- Integración/presentación: `src/AdminCompetitions.tsx`, `src/cup-ab-api.ts`, `src/cup-ab.css`.
- Backend: `worker/competition-total-groups.ts`, `worker/competition-total-segments.ts`, `worker/competition-total-progression.ts`, `worker/competition-knockout.ts`.
- Tests: `tests/cup-total-admin.test.ts`, `tests/competition-total-segments-contract.test.ts`.
- Documentación: `AGENTS.md`, `COPA_TOTAL_SPEC.md`, `ADMIN-COMPETICIONES.md`, este archivo.

## Validación

- 283 tests correctos en 33 archivos. 26 pruebas nuevas de Copa Total sobre SQLite con migraciones reales cubren elegibilidad, grupos, auditoría, sorteo/campeón, segmentos, fixtures, tablas/empates, clasificación/comodines, todas las eliminatorias, tercer puesto, TAFA, autorización y bloqueos.
- Build TypeScript + Vite correcto.
- Edge real a 390 × 844: flujo completo manual/automático hasta Final/tercer puesto, sin overflow horizontal de página ni errores JavaScript. Tablas con desplazamiento contenido.
- Sólo D1 local. Sin merge a main, deploy ni modificaciones a D1 remota. Credenciales y resultados de esta guía son exclusivamente ficticios/locales.
