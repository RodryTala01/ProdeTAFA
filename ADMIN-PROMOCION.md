# Promoción Admin

Acceso: Admin → Competiciones → temporada → Promoción → Administrar.

1. En Cupos, generar la propuesta según las posiciones finales de Liga A/B. Se muestran posición base, participante propuesto y confirmado. Resolver vacantes o corrimientos manualmente con motivo; confirmar cuatro personas activas distintas.
2. En Configuración general crear una etapa eliminatoria y vincular una Fecha NORMAL. En Cruces seleccionar esa etapa y Fecha compartida, y crear los dos encuentros fijos. Los cupos quedan bloqueados.
3. Usar CupEncounter para actualizar puntos y confirmar cada ganador. Ante empate, utilizar el flujo TAFA compartido. No hay armado libre ni decisión excepcional que cambie los cruces.
4. En Movimientos, revisar ganadores hacia A y perdedores hacia B. Generar la propuesta final; los movimientos guardados muestran nombres, división de origen/destino y estado. Esta acción no cambia las divisiones actuales ni crea una temporada nueva.

Los corrimientos por Copa A/B se resuelven con decisión Admin auditada, nunca automáticamente. La propuesta puede regenerarse mientras sus movimientos sigan propuestos; se bloquea si ya fueron confirmados o aplicados.

## Implementación

- `src/AdminPromotion.tsx`: Cupos, Cruces y Movimientos.
- `src/promotion-admin.ts`: validación, carga y vista previa.
- `src/AdminCompetitions.tsx`: acceso a la administración específica.
- `worker/competition-promotion.ts`: backend existente, con lectura de movimientos en el GET de cupos y protecciones para preservar cupos/cruces y estados cerrados.
- `tests/promotion-admin-ui.test.ts`: posiciones visibles, duplicados/motivos, vista previa, movimientos y carga de endpoints.
- `tests/promotion-admin-functional.test.ts`: flujo persistido, bloqueos y generación de movimientos.

Se reutilizan los endpoints promotion/slots, promotion/prefill, promotion/matches y promotion/stages/:stageId/finalize, además del knockout compartido para puntajes y TAFA. Sin migraciones nuevas, deploy ni acceso a D1 remota.
