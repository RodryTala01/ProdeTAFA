// The existing append-only audit ledger records override activation/reset.
// Keep provider as identity; legacy rows marked 'manual' remain protected.
export function manualResultSql(alias: string) {
  return `(${alias}.provider = 'manual' OR COALESCE((SELECT a.action FROM audit_log a
    WHERE a.entity_type='match' AND a.entity_id=CAST(${alias}.id AS TEXT)
      AND a.action IN ('match.result_override','match.result_override_reset')
    ORDER BY a.id DESC LIMIT 1), '') = 'match.result_override')`;
}
export async function originalResultProvider(db: D1Database, match: {id: number; provider: string}) {
  if (match.provider !== 'manual') return match.provider;
  const row = await db.prepare(`SELECT json_extract(before_json,'$.provider') AS provider
    FROM audit_log WHERE entity_type='match' AND entity_id=? AND action='match.result_override'
      AND json_valid(before_json) AND json_extract(before_json,'$.provider') IN ('api-football','promiedos')
    ORDER BY id DESC LIMIT 1`).bind(String(match.id)).first<{provider: string}>();
  return row?.provider ?? null;
}
