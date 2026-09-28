# Transición de temporada Admin

Acceso: Admin → Competiciones → elegir T32 → Transición T32 → T33.

1. Generar plan. Al volver a la pantalla se recupera el plan existente mediante GET, sin crear otro ni cambiar sus datos.
2. Revisar issues originales, división actual/propuesta, origen y motivo de cada participante. Se muestran cantidades por división e inactividad.
3. Corregir destino A/B. El motivo es obligatorio si cambia la propuesta o si la fila requiere revisión, incluso conservando su destino.
4. Revisar el conjunto y confirmar. La edición queda bloqueada y la confirmación se audita; todavía no se crea T33.
5. Actualizar bloqueos si se completó IFFHS. Aplicar sólo está habilitado para un plan confirmado sin bloqueos. El backend vuelve a comprobarlos.
6. Tras aplicar, la pantalla muestra T33 creada en borrador (`draft`) y permite abrirla, actualizando la lista de temporadas.

## Bloqueos

- Inactivos: no hay una regla definida sobre su inclusión. El plan conserva sus nombres pero no puede aplicarse. No se decide excluirlos ni reactivarlos automáticamente; cambiar su destino no resuelve ese bloqueo.
- IFFHS: cada integrante del plan necesita total en la temporada origen, calculado o importado. La cantidad global de totales no reemplaza la cobertura individual.
- Temporada destino existente: no se crea de nuevo ni se modifica mediante este flujo.

Los issues de generación permanecen visibles como referencia histórica tras las correcciones y la confirmación. Los bloqueos de aplicación se calculan con el estado actual al consultar/aplicar.

Se reutiliza season-transition.ts para generación, confirmación y aplicación. Se amplía la lectura por temporada para recuperar el plan y mostrar bloqueos/temporada destino. No hay nuevas migraciones, reglas de ascenso ni automatización de inactivos.

UI: AdminSeasonTransition.tsx, transition-admin.ts y acceso en AdminCompetitions.tsx. Tests: season-transition-functional.test.ts y season-transition-admin-ui.test.ts.
