// Per-account and per-IP throttling for the phone/password login.
// Uses D1 atomic UPSERTs so multiple Worker instances share a common limit.
// This does not change existing passwords, sessions or official predictions.
const WINDOW_SECONDS = 15 * 60;
const PHONE_LIMIT = 8;
const IP_LIMIT = 32;
const encoder = new TextEncoder();
type Db = D1Database;

function epoch(nowMs: number) { return Math.floor(nowMs / 1000); }
async function key(kind: 'phone'|'ip', value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(kind + ':' + value)));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
function subjects(phone: string, ip: string | null) {
  const safeIp = ip?.trim();
  // Without Cloudflare's canonical client address do not group all users
  // under a shared "unknown IP" counter.
  return [{kind:'phone' as const,value:phone,limit:PHONE_LIMIT},
    ...(safeIp ? [{kind:'ip' as const,value:safeIp,limit:IP_LIMIT}] : [])];
}

export async function loginRetryAfter(db: Db, phone: string, ip: string | null, nowMs=Date.now()) {
  const now=epoch(nowMs);
  let remaining=0;
  for (const subject of subjects(phone,ip)) {
    const digest=await key(subject.kind,subject.value);
    const row=await db.prepare('SELECT failed_attempts,window_started_at FROM login_attempts WHERE subject_key=?')
      .bind(digest).first<{failed_attempts:number;window_started_at:number}>();
    if (!row) continue;
    const age=now-Number(row.window_started_at);
    if (age>=0 && age<WINDOW_SECONDS && Number(row.failed_attempts)>=subject.limit)
      remaining=Math.max(remaining,WINDOW_SECONDS-age);
  }
  return remaining;
}

export async function recordLoginFailure(db: Db, phone: string, ip: string | null, nowMs=Date.now()) {
  const now=epoch(nowMs);
  for (const subject of subjects(phone,ip)) {
    const digest=await key(subject.kind,subject.value);
    await db.prepare(`INSERT INTO login_attempts(subject_key,failed_attempts,window_started_at,last_failed_at)
      VALUES(?,1,?,?) ON CONFLICT(subject_key) DO UPDATE SET
      failed_attempts=CASE WHEN excluded.last_failed_at-login_attempts.window_started_at>=?
        THEN 1 ELSE login_attempts.failed_attempts+1 END,
      window_started_at=CASE WHEN excluded.last_failed_at-login_attempts.window_started_at>=?
        THEN excluded.window_started_at ELSE login_attempts.window_started_at END,
      last_failed_at=excluded.last_failed_at`)
      .bind(digest,now,now,WINDOW_SECONDS,WINDOW_SECONDS).run();
  }
}

export async function clearLoginFailures(db: Db, phone: string) {
  const digest=await key('phone',phone);
  await db.prepare('DELETE FROM login_attempts WHERE subject_key=?').bind(digest).run();
}
