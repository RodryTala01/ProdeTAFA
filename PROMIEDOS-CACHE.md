# Promiedos: acquisition outside Cloudflare

PR #16 uses GitHub Actions to acquire Promiedos data. The deployed Worker has no
Promiedos network client: search, match selection and result sync read D1 cache.
API-Football legacy still uses its existing integration. No scoring changes.

## Storage and safety

`0015_promiedos_cache.sql` creates only `promiedos_cache` and its queue index.
There are no foreign keys, triggers, or alterations to sporting tables.
`day` records contain fixture lists with competition/team metadata; `game` records
contain provider details including regulation, extra time and penalty stages.
Advertising and unrelated provider fields are removed at ingestion.

An absent/expired record queues acquisition in the same isolated table. Search
shows a retry message; synchronization preserves existing sporting results and
reports a warning. There is no live network fallback from Cloudflare.
Fixture lists expire after six hours; game details after 30 minutes. These are
cache policies, not changes to kickoff locks or sporting rules.

Ingestion validates all entries before an atomic batch, rejects malformed/ambiguous
game details, and refuses older timestamps and regressive game states. A failed
acquisition never clears a valid cache record. The normal sync path alone applies
results and existing scoring; ingestion cannot write sporting tables.

## Acquisition workflow

`.github/workflows/promiedos-cache.yml` is a workflow with workflow_dispatch and a */5 * * * * schedule,
gated by repository variable `PROMIEDOS_CACHE_ENABLED=true`. Scheduling is authorized for the live-sync fix. The manual diagnostic workflow validates the acquisition clock and does not ingest data.

Before any production activation, separately authorize/apply migration 0015 and
deploy the reviewed Worker. Configure a new random token (at least 32 characters)
as `PROMIEDOS_INGEST_TOKEN` in both Worker secrets and GitHub Actions secrets.
Set repository variable `PROMIEDOS_APP_URL` to the HTTPS application origin.
No existing secret, including FOOTBALL_API_KEY, is reused or changed.
These credentials and the enable flag have **not** been configured by this PR.

The workflow requests `GET /api/internal/promiedos-cache/work` with the dedicated
Bearer token. The plan includes queued misses, a week of missing/expired fixture
lists, and selected open-round games in the existing sync window. It prioritizes
active games, excludes manual corrections/finalized games and sends no participant
data to Actions. Work is bounded to 14 days and 24 game IDs per run.

Actions fetches each item, discovers X-VER only after invalid provider payloads
(one retry), and POSTs validated snapshots to `/api/internal/promiedos-cache`.
Transport failures do not trigger discovery loops. Logs contain counts/IDs only;
there are no response artifacts. Requests have timeouts and no protection bypasses.

Cloudflare consumes cached results through syncEligibleRounds() every five
minutes (*/5 * * * *). Acquisition also runs every five minutes, even while a
game cache entry remains within its 30-minute TTL. Started open-round games stay
eligible until finalized; overdue NS games are retried without a four-hour cutoff
so an erroneous old kickoff cannot permanently strand them. Manual overrides and
finalized games are excluded. The day TTL remains six hours.

These independent schedulers do not provide a strict five-minute end-to-end SLA:
GitHub can delay scheduled jobs, and upload/consume cycles may be out of phase.
The Worker never falls back to a direct Promiedos request. This change is prepared
in a PR; production activation follows merge/deploy authorization.

## Verification and rollback

Targeted SQLite tests cover ingestion authentication, atomic validation, ordering,
cache expiry, queueing, provider-only writes, and cached search/sync without fetch.
CI applies 0015 locally before the full suite/build and isolated T32 E2E.
Preflight/deep health require the new table/columns and migration ledger entry.
Production migration and deployment are intentionally not run during development.

Disable the workflow flag or remove the dedicated token to stop ingestion; existing
cached data simply expires. Keep the isolated table on rollback. No sporting rows
are deleted or rewritten by disabling the cache.

## Kickoff diagnosis and repair

The previous assumption that all runners receive US Central time was incorrect.
Read-only diagnostics on 2026-11-27 received 15:00 from a Los Angeles runner,
17:00 from another runner, and 20:00 from Argentina for the same fixture
(Vélez–Independiente, 2026-11-28). Its verified UTC kickoff is 23:00.

Acquisition resolves its ephemeral runner timezone using ipwho.is, with ipapi.co
as fallback (explicitly authorized). Only the IANA timezone is retained/logged;
never IPs or response bodies. Failure stops acquisition and preserves cache.
Each normalized game stores sourceTimeZone and clockVersion=2. Worker conversion
uses that named zone, including DST; legacy zone-less cache is re-requested.
Day keys are Argentina dates: acquisition includes adjacent source days as needed
and memoizes them per run. No midnight fixtures are dropped or shown on the wrong day.
Automatic corrections preserve IDs, official predictions, results, Admin overrides
and already closed locks. Future scheduled corrections are audited atomically.

Promiedos started/final statuses also block prediction writes regardless of a
future kickoff. If a started status contradicts a still-open timestamp, submission
fails closed before the existing snapshot triggers can promote that draft. It
requires a fresh sync/review; no migration or trigger rewrite is needed.

The production SELECT could not be completed: Cloudflare returned account access
error 7403. The exact origin of the previously stored wrong values is therefore
not established, and no production sporting data was rewritten during this fix.

Home and Pronosticos share live-only 60-second refresh, focus refresh and a
wake-up at the next kickoff. Relevant NS games awaiting their first live update
are checked every five minutes for four hours; idle/final rounds are not polled.
Refresh keeps the page and edited drafts mounted. Repeated cache-pending warnings
are grouped; other provider warnings retain their match context. Cache ingestion
itself still writes only provider storage.


## Disparo confiable desde Cloudflare

El scheduler de GitHub Actions no se usa como reloj primario porque su ejecución puede demorarse bajo carga. El Cron de Cloudflare sigue en `*/5 * * * *` y, después de intentar aplicar cualquier caché fresca, calcula el mismo plan de trabajo de Promiedos. Si hay días vencidos/solicitados o partidos activos, el Worker dispara `promiedos-cache.yml` mediante `workflow_dispatch`.

Cloudflare no consulta Promiedos: sólo llama a la API de GitHub Actions. La adquisición sigue siendo GitHub Actions -> Promiedos -> endpoint interno autenticado -> D1. El workflow conserva `workflow_dispatch` y ya no depende de `schedule`.

Producción requiere el secreto Cloudflare `GITHUB_ACTIONS_TOKEN`, idealmente un fine-grained PAT limitado al repositorio `RodryTala01/ProdeTAFA` con permiso repository Actions: write. El token nunca se envía al frontend ni se registra en logs.
