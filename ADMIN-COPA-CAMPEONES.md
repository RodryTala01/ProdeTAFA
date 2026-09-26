# Copa Campeones Admin

Acceso: Admin → Competiciones → temporada → Administrar Copa Campeones.

1. **Cupos**: generar propuesta desde la temporada anterior. Cada tarjeta muestra fuente, propuesto, confirmado, estado y motivo guardado.
2. Resolver vacantes/duplicados seleccionando participantes activos de las divisiones de esta temporada. Cada reemplazo o vacante requiere motivo. No se asignan reemplazos automáticamente.
3. Confirmar los 14 cupos únicos. Los cambios pendientes bloquean la inicialización. Regenerar propuesta reemplaza las selecciones guardadas y está indicado en pantalla.
4. Inicializar la llave fija: se leen los 13 nodos del backend, sin duplicar la definición deportiva en frontend. Tras inicializar, los cupos quedan bloqueados.
5. Recorrer **Rama superior**, **Rama inferior**, **Final**. Los nodos esperan sus dos fuentes confirmadas. Elegir etapa KNOCKOUT y una Fecha NORMAL vinculada a esa etapa; activar mediante el endpoint específico.
6. Usar CupEncounter para puntajes, confirmación de ganador y TAFA. Actualizar puntajes y fuentes refresca las etapas y vuelve a leer los nodos para evitar fuentes obsoletas. No hay tercer puesto ni cambio genérico de ganadores.

La configuración general existente permite crear etapas y vincular Fechas. No se agrega motor ni migración. Las mutaciones se bloquean tanto en frontend como backend si temporada/competición está cerrada. Regenerar propuesta también se bloquea después de inicializar, aunque todavía no haya encuentros activos.

## Archivos y endpoints

UI: `src/AdminCupChampions.tsx`, `src/champions-admin.ts`, integración en `src/AdminCompetitions.tsx`. Reutiliza estilos de Copas y `CupEncounter` sin modificarlo.

Se usan exclusivamente los endpoints existentes `/champions/slots`, `/champions/prefill`, `/champions/bracket`, `/champions/nodes/:code/activate`, y knockout/TAFA compartidos. `worker/competition-champions.ts` sólo agrega los bloqueos de cierre y de regeneración mencionados.

Pruebas: `tests/champions-admin-ui.test.ts` cubre renderizado de propuesta/confirmación/motivo, validaciones del formulario, bloqueo de nodos y orden de refresco de fuentes. Se conservan las pruebas SQLite de `tests/champions-admin-functional.test.ts`, ampliadas con los bloqueos de cierre e inicialización. La UI usa tarjetas, controles de ancho completo y navegación flexible para móvil.

Sin deploy, merge a main ni operaciones sobre D1 remota.
