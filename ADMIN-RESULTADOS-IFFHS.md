# Resultados finales e IFFHS Admin

En Admin → Competiciones → temporada → Administrar una competición, abrir Resultados finales. Promoción mantiene su flujo propio de movimientos y no agrega componentes IFFHS.

Revisar la fase deportiva de cada etapa eliminatoria antes de preparar la propuesta. Las etapas ambiguas quedan sin inferir: completar manualmente la fase alcanzada de cada entrada. La propuesta de Liga requiere cinco Fechas finalizadas y tabla definitiva; los títulos se proponen sólo desde encuentros confirmados. Los resultados editados se muestran antes de guardar y requieren revisión explícita del snapshot completo. La confirmación reemplaza todas las filas y guarda auditoría en el mismo batch.

La vista muestra autor y hora de la confirmación en Buenos Aires. En Dúos se muestra la composición histórica y, con sustituciones, se eligen explícitamente los destinatarios IFFHS. No se crea otra fuente de palmarés ni tabla de campeones.

Desde IFFHS Admin, en la temporada seleccionada:

1. Revisar resultados pendientes; finalizar las competiciones desde Configuración general cuando corresponda.
2. Calcular temporada. El backend verifica resultados completos y protege temporadas importadas.
3. Elegir temporada límite y abrir el ranking de las últimas cinco temporadas. Se muestran temporadas faltantes y fuentes por participante/temporada.
4. Abrir un desglose para revisar componentes por competición, base, multiplicador y puntos.
5. Para historia faltante, cargar temporada, participantes (también inactivos) y totales. La importación rechaza cualquier fila ya existente, sin sobrescribir datos.

Archivos de UI: AdminResults.tsx, results-admin.ts, AdminIffhs.tsx e integración en AdminCompetitions.tsx. Se reutilizan GET/PUT results y ranking/components/calculate/totals de IFFHS. El GET results amplía sólo para Admin las entradas y evidencias deportivas; el PUT valida snapshot completo y destinatarios históricos. No hay migraciones nuevas.
