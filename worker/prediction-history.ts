export async function predictionHistory(request: Request, db: D1Database, roundId: number, ownUserId?: string) {
  const round = await db.prepare('SELECT id, name, status FROM rounds WHERE id = ?').bind(roundId).first<{ id: number; name: string; status: string }>();
  if (!round || (ownUserId && round.status === 'draft')) return Response.json({ error: 'Fecha no encontrada' }, { status: 404 });
  const query = new URL(request.url).searchParams;
  if (ownUserId && query.has('userId') && query.get('userId') !== ownUserId) {
    return Response.json({ error: 'Sólo podés consultar tu propio historial' }, { status: 403 });
  }
  const eventType = query.get('type') || null;
  if (eventType && !['FIRST_SUBMISSION', 'PREDICTION_CHANGE', 'RESUBMISSION'].includes(eventType)) {
    return Response.json({ error: 'Tipo de evento inválido' }, { status: 400 });
  }
  const participants = await db.prepare(
    `SELECT u.id, u.full_name AS name, u.is_active AS active,
       rs.first_submitted_at AS firstAt, rs.last_submitted_at AS lastAt, COALESCE(rs.submission_count,0) AS count
     FROM users u LEFT JOIN round_submissions rs ON rs.user_id=u.id AND rs.round_id=?
     WHERE u.role='participant' AND (? IS NULL OR u.id=?) ORDER BY u.full_name,u.id`,
  ).bind(roundId, ownUserId ?? null, ownUserId ?? null).all();
  const userId = ownUserId ?? query.get('userId');
  if (!userId) return Response.json({ round, participants: participants.results, events: [], submission: null });
  const participant = participants.results.find((user) => user.id === userId);
  if (!participant) return Response.json({ error: 'Participante no encontrado' }, { status: 404 });
  const cursorText = new URL(request.url).searchParams.get('before');
  const before = cursorText === null ? Number.MAX_SAFE_INTEGER : Number(cursorText);
  if (!Number.isSafeInteger(before) || before <= 0) return Response.json({ error: 'Página inválida' }, { status: 400 });
  const history = await db.prepare(
    `SELECT id, event_type AS type, actor_kind AS actor, created_at AS at, fields_json, before_json, after_json
     FROM prediction_submission_events WHERE round_id = ? AND user_id = ? AND id < ?
       AND (? IS NULL OR event_type=?) ORDER BY id DESC LIMIT 51`,
  ).bind(roundId, userId, before, eventType, eventType).all<{
    id: number; type: string; actor: string; at: string; fields_json: string; before_json: string | null; after_json: string;
  }>();
  const rows = history.results ?? [];
  const submission = await db.prepare(
    `SELECT first_submitted_at AS firstAt, last_submitted_at AS lastAt, submission_count AS count
     FROM round_submissions WHERE round_id = ? AND user_id = ?`,
  ).bind(roundId, userId).first();
  return Response.json({
    round, participants: participants.results, participant, submission,
    events: rows.slice(0, 50).map((row) => ({
      id: row.id, type: row.type, actor: row.actor, at: row.at,
      fields: JSON.parse(row.fields_json),
      before: row.before_json === null ? null : JSON.parse(row.before_json), after: JSON.parse(row.after_json),
    })),
    nextCursor: rows.length > 50 ? rows[49].id : null,
  });
}
