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

## Acquisition workflow (not activated)

`.github/workflows/promiedos-cache.yml` is a separate **manual-only** workflow,
gated by repository variable `PROMIEDOS_CACHE_ENABLED=true`. No schedule has been
added. The diagnostic workflow from PR #17 is unchanged and is not an ingestion job.

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

The Cloudflare Cron remains `*/10 * * * *`, now consuming cached Promiedos data.
Automatic acquisition is **pending explicit scheduling approval**: until then,
manual workflow runs refresh cache, and stale data fails closed. This PR is not
ready for unattended production use without enabling acquisition.

## Verification and rollback

Targeted SQLite tests cover ingestion authentication, atomic validation, ordering,
cache expiry, queueing, provider-only writes, and cached search/sync without fetch.
CI applies 0015 locally before the full suite/build and isolated T32 E2E.
Preflight/deep health require the new table/columns and migration ledger entry.
Production migration and deployment are intentionally not run during development.

Disable the workflow flag or remove the dedicated token to stop ingestion; existing
cached data simply expires. Keep the isolated table on rollback. No sporting rows
are deleted or rewritten by disabling the cache.
