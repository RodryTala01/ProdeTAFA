# Contextos por Fecha implementados

ParticipantRound presenta «Estás jugando esta Fecha en:» sobre los 12 partidos, tanto para la Fecha abierta como para una histórica. No cambia autosave, envío, reenvío ni scoring. Un fallo de carga de contextos permite continuar pronosticando y ofrece reintentar.

GET /api/participant/rounds/:roundId/competition-contexts requiere sesión participante activa, deriva userId de ella y rechaza el parámetro userId. Devuelve 404 para Fechas inexistentes o borradores, 403 para acceso no autorizado y 405 para métodos distintos de GET.

La respuesta contiene round y contexts con identificadores estables, ordenados por tipo y orden de competición. Sin escrituras ni nuevos modelos de pronósticos.

- LEAGUE: división de la temporada y secuencia de Fecha, sin standings duplicados.
- ACCUMULATIVE_GROUP: grupo realmente asignado a la entrada.
- TOTAL_GROUP: grupo y todos sus encuentros de los segmentos de la Fecha. Mini-day deriva de secuencias persistidas; puntajes/completitud reutilizan scoreEntrySegment.
- DUO_SURVIVAL: entrada, nombres históricos, compañero y bonus. No incluye Fechas posteriores a un snapshot previo ELIMINATED o QUALIFIED en esa etapa.
- KNOCKOUT: encuentro real, rival/bye, scores almacenados, resolución y nodo de Campeones si existe. Dúos usa integrantes vigentes también para nombrar rivales.
- TIEBREAK: competencia original y lista de todos los rivales, incluyendo empates múltiples. Usa competition_tiebreak_rounds/entries sin requerir round_link. Por eso roundLink es null y stage puede ser null; no se inventa un vínculo.

La membresía aplica valid_from_round_id <= roundId y valid_to_round_id > roundId, admitiendo null en ambos extremos. Una entrada eliminada hoy conserva los contextos que disputó. Los cruces/desempates cancelados no generan participación.

El listado general de temporada conserva su alcance histórico y lo declara con competitionMembershipScope=SEASON_HISTORY. Para decidir pertenencia efectiva en una Fecha, usar este endpoint.

Archivos: worker/participant-contexts.ts, ruta en worker/predictions.ts, tipos/presentación en src/competition-contexts.ts y src/ParticipantCompetitionContexts.tsx, integración mínima en ParticipantRound.tsx. No hay nuevas migraciones.

Tests SQLite: división Liga, Liga+TAFA múltiple, grupos A/B y deduplicación, rival knockout, eliminación e historia, tres mini-fixtures Total, sustitución Dúos y exintegrante, survival, semifinal/final Dúos, nodo Campeones, Papa, Promoción, bye, aislamiento por sesión y 12 pronósticos únicos. Tests de render confirman que la lista de contextos no agrega inputs ni botones de envío.
