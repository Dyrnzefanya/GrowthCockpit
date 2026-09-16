# Data Model

## Phase 13 retention

Forward migration `0032_retention.sql` adds no table or index. Its service-role-only `run_retention` function nulls `webhook_events.payload` after 90 days and deletes `integration_runs` after 12 months using a supplied/effective clock. Repeated execution returns zero additional changes. Event identity, status, result and correlation evidence remain after payload removal. The existing `sync_state` rows retain the latest bounded operational status after old run history is pruned.

## Phase 12 reports

Forward migration `0030_reports.sql` adds the sole Phase 12 table, `reports`. A row stores report type, ISO week start/end, version, status, validated facts JSON, narrative Markdown, creator/finaliser and revision timestamps. The facts include the Asia/Jakarta timezone and `weekly-v1` schema version. `(type, period_start, version)` is unique; only weekly reports are generated. Facts contain current/previous metric components, campaign observations, funnel and workflow summaries, experiment context, notes, unresolved alerts, decision actions, source health and mandatory caveats.

RLS permits authenticated SELECT only. Direct anonymous/authenticated writes and DELETE are denied; narrow service-role functions create an idempotent draft, save a revision-checked narrative and finalise a revision-checked row. The immutable trigger rejects every update or delete whose existing status is final. A final week therefore remains byte-stable; a later generation receives `version + 1`. Forward migration `0031_report_trigger_return.sql` corrects the trigger to return `NEW` for permitted draft updates while preserving final immutability.

The reports table is a frozen presentation snapshot, not a parallel fact model. Assembly reads existing authoritative facts and stores their rendered inputs once. No report metric, export, delivery or narrative table is added. Generated database types include the report row and the three service RPCs.

## Phase 11 rule evidence and operator actions

Forward migration `0027_rule_evaluations.sql` creates the sole new table, `rule_evaluations`: rule/version, evaluation clock, date window, typed scope/id, verdict, immutable evidence and optional alert FK. Authenticated users have SELECT through RLS; service-role INSERT is allowed, UPDATE/DELETE are denied. A unique rule/version/clock/scope key makes batch retries idempotent without rewriting earlier evaluations. Evidence includes raw numeric inputs, comparison and mature windows, source freshness, the exact settings snapshot, matched condition, effective verdict, precedence, limitations and suggested action.

Existing `alerts` gains snooze/dismiss expiry, reason, total dismissal count and dismissal timestamps/actors in `action_dismissals`. Existing delivery history remains bounded independently. Narrow machine RPCs persist application-computed alerts/evaluations under the live job lease and compare revisions for operator actions. `sync_state(decisions,evaluation)` retains the atomic resume cursor separately from runner finalization. No action-dismissals table is added. Settings gain an append-only audit array protected from direct authenticated column updates; its trigger records old/new values, actor and time.

New `rules.*` settings contain nullable target CPQL/currency, nullable frequency threshold, explicit lead-generation campaign IDs and PRD relative-change defaults. Existing health/sample/maturity settings are reused. Missing target CPQL is preserved as JSON null, never zero or a guessed business target. `0028_decision_evidence_context.sql` extends the bounded projection with linked open-pipeline facts, includes yesterday's overdue outcome cutoff, and records the precise snooze override reason. `0029_decision_tracking_clock.sql` includes current-day inquiries in tracking evidence while cohort windows stay complete-day only, and fences stale snooze override revisions. All three are forward-only; applied Phase 0–10 migrations remain unchanged. Generated types include the new evidence/action/audit fields.

## Phase 10 paid-media facts

`0023_ad_metrics.sql` adds only `ad_accounts` and `ad_metrics_daily` with RLS, read-only authenticated grants, restricted machine writes and no service-role DELETE grant. The account key is `(platform, external_account_id)`; the fact key is `(ad_account_id, metric_date, campaign_id, adset_id, ad_id)`. Current ingest writes campaign grain, with empty adset/ad IDs. Store numeric(18,2) spend, currency, source timezone, raw impressions/clicks, optional reach/frequency, and explicitly selected platform result type/count/cost. Null optional metrics stay null. Provider results never populate inquiry counts.

`0024_performance_read_models.sql` supplies the narrow health projection and extends `vw_lead_quality_by_campaign` with discriminated `inquiry` and `spend` fact rows. Consumers must respect `row_kind`: this avoids duplicating a campaign's spend across lead currency groups. The Performance service uses `performance_facts` for raw aggregate components and performs the final identity join and all ratios in the domain. `0025_meta_failure_fence.sql` protects failure metadata with the same job lease as page commits. `0026_meta_range_recovery.sql` clears pending progress only under an acquired lease, preserving facts and failed-run history. Generated types reflect local migrations 0001–0026. Existing migrations were not edited; remote migrations were not applied.

`app_settings` holds a nullable explicit primary result action, daily freshness hours, and provider-verified expiry metadata without tokens. Existing settings audit behavior remains in force. `sync_state` holds the pending source account/date/page and completed-day count; `integration_runs` holds job status, record counts and correlation IDs. Revenue uses persisted won-deal allocations, retaining their original rule version and currency; no attribution or CRM-owned record is rewritten. Fractional minor units are retained through won-revenue allocation and rounded once per currency aggregate, avoiding per-allocation truncation.

## Phase 9 alerts

Forward-only migration `0022_alerts.sql` creates `alerts` with a deterministic `alert_key`, type/severity/source/entity reference, operator-facing title/message, allowlisted JSON evidence, occurrence and notification counters, lifecycle timestamps/reasons, delivery state and a 100-event JSON history. A partial unique index permits at most one unresolved row per key while preserving resolved history. Status is `open`, `acknowledged`, `resolved` or `suppressed`; notification status is `pending`, `sent`, `failed` or `suppressed`.

`raise_alert` locks the key and atomically creates, refreshes or reopens the unresolved record. Batch raise is capped at 500. Transition, due-reactivation, condition reconciliation and delivery-recording RPCs preserve audit history and reject invalid state changes. Authenticated sessions have read-only RLS; anonymous access and direct authenticated writes are denied. Service-role mutation RPCs do not grant table deletion. `alert_notification_volume` is a security-invoker read model grouped by Asia/Jakarta business date and alert type. Generated types reflect local migrations 0001–0022; remote application is not claimed by local evidence.

## Phase 8 CRM mirrors

Forward-only migration `0019_hubspot_mirror.sql` adds no tables: it permits a genuine provider-ID-only CRM contact, seeds null `hubspot.mapping` (sync disabled), and adds a service-only atomic mirror commit. Existing CRM table RLS/grants remain unchanged; anonymous and authenticated users cannot invoke this machine RPC. Stable external IDs prevent duplicate mirror rows; local revision CAS and source timestamps prevent stale overwrites. Manual inquiry audit and first/last touch remain preserved. The RPC accepts only the four existing CRM/inquiry tables and rejects protected audit/override patches.

`0020_crm_activity_audit.sql` keeps the security-invoker activity view while excluding same-qualification audit events. CRM deal stage changes retain a source=hubspot timeline event without counting a fabricated MQL/SQL transition. Won deal attribution uses the existing allocations and rule-version columns; no spend, FX or analytics table is invented. Generated types reflect local migrations 0001-0021. `0021_hubspot_run_namespace.sql` identifies HubSpot queue attempts as integration=hubspot while retaining the existing claim mechanics and grants. All migration/schema/RLS evidence here is local; remote development database state is unchanged.

## Phase 7 plumbing

Local migration 0016 adds webhook_events, integration_runs, sync_state and leads.source_event_id. It permits a null stage actor for machine processing without creating a fake profile. All three new tables enable RLS at creation: authenticated SELECT only, privileged repository writes. Service-role DELETE is explicitly revoked by forward migration 0018 because Supabase's default table grant otherwise includes it. Phase 13's narrow security-definer retention function is the only delete path for expired run history and the only bulk payload-nulling path.

Webhook idempotency uses a unique key. Migration 0017 also makes the authenticated request digest unique, preventing an attacker from swapping the unsigned Idempotency-Key on an otherwise identical valid signature. Raw JSON is retained only for authenticated requests. Receipt/outcome and correlation IDs allow safe replay without an additional write. Claim IDs fence atomic event/lead completion; SKIP LOCKED claims recover expired workers and retain attempt logs.

Integration runs record trigger, status, counts, timing, redacted error and correlation ID. A per-job advisory transaction lock plus expiring running-row lease protects work across pooled RPCs. Sync state records cursor, last run/success and consecutive failures. Retry delays/terminal classification stay in TypeScript. At Phase 7 closure no remote migration was claimed; migrations 0001–0018 are the local development schema.

## Phase 6 CRM / inquiry core

Migrations 0010–0015 create the five Phase 6 tables and four security-invoker fact views, then forward-only corrections to bounded batch/snapshot execution. Applied migrations are never edited. At Phase 6 closure no Phase 7 source-event table or ingest endpoint existed; the Phase 7 additions are listed above. No spend table exists.

- `companies`: domain-first/name-second resolution; domain uniqueness and normalized name index.
- `contacts`: a person with at least one valid normalized channel supplied by the domain. Partial email/phone uniqueness, optional company, immutable first-touch evidence.
- `leads`: inquiry timestamp and WIB business date, optional contact/company, product identity, immutable last touch, q1 verdict/reasons/settings snapshot, qualification dates, manual override flag, actor owner, missing-attribution flag, optional deal. Submission keys prevent replay; observation timestamps implement the operator's rolling inclusive 24-hour dedupe rule. Missing identity never denotes a shared person.
- `lead_stage_events`: append-only status history with from/to, timestamp, actor, source, and reason. Neither UPDATE nor DELETE is permitted through product roles.
- `deals`: local manual pipeline/stage/category, exact money/currency, expected/actual close date, audit actor and immutable attribution allocation evidence. No HubSpot writes occur.

Authenticated sessions read shared CRM rows through RLS. Anon has no grants. Authenticated clients cannot mutate mirrors or execute write/snapshot RPCs. Session-verified, authorized services use the guarded admin repository; atomic RPCs persist application decisions and compare revisions. A failed final history write rolls back all earlier batch changes. Settings remain normal authenticated RLS writes with protected audit metadata.

`vw_funnel_daily` assigns current outcomes to original inquiry dates; `vw_funnel_activity_daily` counts events on their actual WIB transition dates. `vw_lead_quality_by_campaign` and `vw_attribution_coverage` provide lead-side facts. Ratios live exclusively in domain/metrics; MQL includes current SQL, win rate uses won/(won+lost), mixed-currency revenue is unavailable, and spend remains null. CSV upload content is never persisted. Phase 6 migrations are verified locally; no remote database migration is performed in this phase.

## Phase 0 state

There are no application tables. `supabase/migrations/0001_extensions.sql` enables `pgcrypto` and `citext` and creates the reusable `public.set_updated_at()` trigger function. Product schemas begin in their PRD-defined phases.

## Phase 2 state

`0002_identity.sql` creates only `profiles` and `app_settings`; both enable RLS in that migration. An auth-user insert provisions a matching profile through `handle_new_user()` with a fixed search path and no public execution grant. User-provided role metadata is ignored. Authenticated users can read only their own profile and update its name/timezone; role changes and profile creation/deletion are privileged operations.

Settings are workspace-wide: authenticated users can read rows and update only `value`. A trigger stamps `updated_by=auth.uid()` and the shared timestamp trigger stamps `updated_at`; clients cannot forge either field. Anon has no table grants or policies. Zod validates settings reads and application writes; unknown keys warn and are ignored, while malformed known values use documented defaults. Operational validation remains in the application, not a database business-rules function.

`0003_identity_defaults.sql` is a forward-only completion of the documented defaults, leaving the already-applied identity migration unchanged. Thirteen settings are seeded; future qualification, attribution, experiment, job, follow-up and metric behavior remains inactive. Generated TypeScript types reflect the applied local schema. `0004_identity_backfill.sql` subsequently repaired profiles for Auth accounts created before schema deployment, without changing these policies. Phase 3 continues at 0005.

## Binding principles (unchanged by Phase 2)

- Contact means a person. Lead means an inquiry event. One contact can have multiple leads.
- HubSpot is authoritative for CRM contacts and lifecycle state. Supabase holds the PM OS operational record and analytics mirror.
- Database identifiers are UUIDs generated with `gen_random_uuid()` unless the PRD specifies an external identifier.
- Timestamps use `timestamptz`; business dates use Asia/Jakarta calendar semantics.
- Money is stored as `numeric(18,2)` plus an ISO currency code (PRD §15.1–15.2). Application aggregation uses decimal strings/BigInt minor-unit arithmetic to avoid floating-point loss; that is not the storage format. Future conversion preserves the PRD source/rate fields. Missing conversion data stays unavailable.
- Attribution records first and last touch as defined by the PRD. Unknown attribution remains unknown; it is never inferred without evidence.
- Funnel facts derive from explicit lead events and lifecycle mappings. Unavailable events or metrics remain null/unavailable.
- Every future public table receives RLS and policies in the migration that creates it.
- Applied migrations are immutable. Corrections use a new forward migration.

## Ownership by phase

| Phase | Schema responsibility                                            |
| ----- | ---------------------------------------------------------------- |
| 0     | Extensions and shared timestamp trigger only                     |
| 2     | Profiles and authentication-linked access                        |
| 3–5   | Today, playbook, and experiment operational records              |
| 6     | Contacts, inquiry-event leads, attribution, and funnel facts     |
| 7     | Webhook events, sync state, integration runs, and job foundation |
| 8–10  | HubSpot, Slack/alerts, and Meta performance mirrors              |
| 11–12 | Decision outcomes and report records                             |
| 13    | Retention, audit, and production hardening changes               |

The exact tables, columns, constraints, indexes, RLS policies, and migration order remain those specified by `PRD.md`; this document does not override them.

## Phase 3 state

- `0005_workflows.sql`: `workflow_templates`, `workflow_runs`, `workflow_items`, `notes`, indexes, timestamp triggers and authenticated RLS policies. No anonymous grants. Notes require `created_by=auth.uid()` on insert and have no normal update/delete grant. Workflow records are shared operational workspace data, as specified by the PRD; normal application writes use the authenticated session, never the privileged client.
- Unique `(template_id, run_date)` and `(run_id, step_key)` enforce idempotency. Run/item snapshots preserve history across edits and deactivation (D-008). `materialize_workflow` inserts a run and its items atomically; `commit_workflow_item` checks the run revision and atomically persists the application-computed item and status. Both are security invoker, have fixed empty search paths, and deny anonymous/public execution.
- `0006_workflow_seeds.sql`: only the three real procedural templates. It inserts no runs, notes, campaigns, metrics or fabricated operator activity.
- Generated TypeScript types reflect local migrations 0001-0006. Phase 3 migrations are applied locally only; the remote development project remains at Phase 2 migration 0004 until deployment is authorized and its outstanding host protection gate is verified.

The local SQL test runs transactionally and rolls back synthetic identities/workflows/notes. Browser fixtures are guarded to loopback Supabase and clean up their own data. No remote reset is permitted.

## Phase 4 state

- `0007_playbook.sql`: `playbook_articles`, its constraints, audit/timestamp triggers, authenticated shared-workspace RLS, weighted stored `search_vector`, GIN/filter indexes, and the security-invoker ranked search RPC. Anonymous table/RPC access is revoked. Normal application operations use an authenticated user session; no service-role shortcut is used.
- Slugs are unique and constrained to URL-safe lowercase values. Drafts start at version 0. Publishing increments the application-computed version and sets `published_at`; archiving preserves the last publication metadata. `updated_at` provides optimistic compare-and-swap protection for updates and deletes. The write trigger always stamps `updated_by=auth.uid()` so clients cannot forge audit ownership.
- `0008_playbook_seeds.sql`: five published operational articles required by FR-4.8. Seeds have no operator identity and contain procedures only, not fabricated activity or performance data.
- Generated TypeScript types reflect local migrations 0001-0008. Phase 3–4 migrations are applied locally only; the remote development project remains at Phase 2 migration 0004 until deployment is explicitly authorized.

The playbook SQL test adds 500 synthetic rows inside a transaction, verifies weighted body search and the query budget, then rolls everything back. Browser fixtures are loopback-guarded and delete their own articles and invited identity.

## Phase 5 state

- `0009_experiments.sql`: `experiments` and `experiment_results`, their PRD checks and foreign keys, timestamp triggers, authenticated read-only RLS, status/review and ownership indexes, and the result full-text GIN index. Anonymous access and direct authenticated writes are denied.
- `experiments.code` is unique and formatted `EXP-YYYY-NNN`. `create_experiment` serializes allocation with a per-year advisory transaction lock and assigns `owner_id=auth.uid()`. The score is application-computed; no redundant score column exists.
- `update_draft_experiment` rejects non-draft or stale rows. `transition_experiment` row-locks and compares the `updated_at` revision, permits only the lifecycle in D-010, stamps the Asia/Jakarta end date supplied by the service, and writes a unique result atomically when completing. The result requires outcome, KPI value, conclusion, learning and next action at both application and database boundaries.
- `external_refs` is a bounded JSON object with only campaign, ad set, ad, and HTTP(S) landing-page fields. Sample count, threshold, warning flag and verdict label are immutable completion evidence. Searchable conclusion, learning and next action are stored in a generated `tsvector`.
- Generated TypeScript types reflect local migrations 0001–0009. Phase 3–5 migrations remain local only; the remote development project is unchanged.

Transactional SQL fixtures roll back lifecycle, RLS, evidence and search checks. A separate local 20-client database test proves race-safe yearly codes and deletes its fixture. Browser fixtures refuse remote Supabase, exercise the full lifecycle, and delete their result, experiment and invited identity.
