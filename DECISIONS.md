# Architectural Decisions

## D-014 — Phase 8 field-level ownership

**Status: ACCEPTED — explicit operator resolution.** Manual PM OS qualification override wins for the local inquiry. HubSpot lifecycle changes never modify an overridden inquiry's status, reason, timestamps or audit history. Mirror the HubSpot lifecycle independently on contacts; HubSpot continues owning CRM lifecycle, deal, owner and opportunity fields. Surface divergence for review without overwriting either value or adding a speculative reconciliation action. Interpret FR-6.8 and section 16 as field-level ownership. Non-overridden inquiries may reflect mapped CRM changes with source=hubspot history.

## D-015 — Phase 8 adapter and mirror persistence

HubSpot event attempts use `integration='hubspot'` in the existing queue's run metadata, while Apps Script remains `lead_ingest`. A forward correction to the shared claim function preserves its locks, claims and grants; it prevents CRM failures from being mislabeled as landing-page ingest failures. Job runs retain the existing `jobs` namespace.

Reuse the Phase 7 run lease for a single outbound CRM writer; concurrent events retry rather than race contact/company creation. An uncertain create response is parked as CONFLICT for inspection, never blindly re-created. Bind outbound provider IDs to the existing local identities before subsequent mirror work. Native 30-minute scheduling remains opt-in through the existing GitHub fallback contract until deployed hosting capability is verified. Explicit manual re-sync may re-evaluate the current provider revision after mapping corrections, but can never roll back to an older revision. The pure record-to-row transformation lives in domain/hubspot.ts (BE-8.3), keeping qualification and attribution out of the transport adapter.

Deal-stage audit entries retain the inquiry's effective from/to qualification and describe the CRM stage change in the note. The activity funnel counts only actual qualification transitions (`from_status IS DISTINCT FROM to_status`), so CRM audit entries cannot inflate MQL/SQL counts. No extra status vocabulary or event table is introduced.

Add the required server-only HubSpot client/mapping/transforms, crm-sync coordination, webhook endpoint, reconcile job and UI. Reuse Phase 7 webhook_events, integration_runs, sync_state, claims and runner; no new table, dependency or broker. A forward migration adds narrow service-only atomic mirror commit and cursor persistence; SQL provides CAS/atomicity and does not decide qualification or attribution. Stable provider IDs and source timestamps fence replay/out-of-order updates. Archived/merged records are retained and flagged, not cascade-deleted. Mirror-only contacts may be identified by a real HubSpot ID even when email/phone are absent; this does not fabricate a contact for anonymous Phase 6 inquiries.

Native fetch and Node crypto suffice. Provider calls stay in the HubSpot client with per-process throttling, deadlines, bounded retry and sanitized error codes. HubSpot request authentication follows its documented v3/v1 private-app signatures rather than requiring the custom Apps Script headers HubSpot cannot supply. V3 never falls back after failure; legacy v1 has no signed timestamp, so durable provider-event identity supplies replay protection. Pin portal identity before queueing. No untrusted host header or configurable API origin.

Mappings must be explicitly configured and valid; no portal/stage/owner IDs are seeded. Invalid mappings disable sync and expose a CRITICAL candidate; unmapped raw values and ambiguous linkages expose WARNING candidates using existing sync/run metadata, with alert delivery remaining Phase 9. First-touch and qualification write-back is allowlisted; deal stage/amount/owner are never written. Uncertain identity/linkage refuses inference. Reconcile resumes bounded fixed windows with five-minute overlap, retaining failed positions. Host protection and actual deployed cadence remain prerequisites for remote activation. External credentials/fixtures and one-week UAT are never fabricated.

## D-013 — Phase 7 delivery, concurrency and scheduler contract

Phase 7 is authorized. Add only `webhook_events`, `integration_runs`, `sync_state` and `leads.source_event_id` in migration 0016. Plumbing has authenticated reads and service-role-only writes. Payloads are retained only after authentication; signature/size/content-type rejections have null payloads. Repeated authenticated idempotency keys do not write another event. Store the receipt and current processing outcome on the event; return 202 after durable acceptance and process with Next.js `after`, with the retry job recovering interrupted work. The same Phase 6 preparation/commit pipeline serves manual, CSV and machine submissions. Machine events have a null human actor, rather than inventing a profile; `source_event_id` supplies provenance.

Use PostgreSQL transaction advisory locks to serialize per-job acquisition plus an expiring running-row lease in `integration_runs` to cover work across PostgREST requests. A session advisory lock acquired in one pooled HTTP RPC cannot safely be held/released by another. No lock table or new database driver. Claims use `FOR UPDATE SKIP LOCKED`, an attempt run ID as fencing token and a lease longer than the 60-second platform limit. Atomic event/lead commit verifies the live claim. Expired attempts are recorded as failed and recovered; late workers cannot commit. Job budget is 40 seconds, reserving 24 seconds before each claim and leaving room for bounded database calls and finalization before the 60-second platform limit. Per-call database timeouts remain in effect. Queue cursors are due rows, never a moving lookback window.

Resolve conflicting summary wording by the explicit Phase 7 requirements and section 21: retryable failures use `failed`; terminal validation/business errors use `rejected`; exhausted attempts use `dead_letter`. `jobs.max_attempts` counts total processing attempts (default five). Full-jitter delay caps are 1m, 5m, 25m, 2h, 6h (last cap applies if a higher attempt limit is configured); no sixth attempt at the default. Critical candidates are derived from durable dead letters/consecutive failures; delivery and scheduler-wide outage alerting remain Phase 9. The Phase 7 job list exposes last-run age now. Scheduler precondition references Appendix A10, not nonexistent A12.

Vercel Cron uses GET, so a bearer-only GET adapter on the same job path calls the POST runner; session-authenticated manual execution remains same-origin POST with `can("integration:write")`. Both adapters enforce production/JOBS_ENABLED for scheduled calls. Operator clarification: Landing Page Apps Script is the first signing source. Treat ten-minute native Vercel Cron as unavailable until the actual plan is verified; no paid-plan dependency. `vercel.json` has no active cron so the current Hobby deployment remains compatible. The registry declares the ten-minute target and an opt-in GitHub Actions fallback calls the same endpoint. A documented native binding can be installed only after plan verification; never enable both schedulers. Deployed high-frequency activation is a separate infrastructure requirement. This avoids pg_cron/pg_net and changes no extension whitelist. Hosting plan/source registration and deployed cadence remain external evidence, not presumed success. No n8n, Phase 8 connector or Phase 9 alert table is added.

Public health returns only status/version/commit/database reachability. New machine secrets are optional when the feature is unconfigured, at least 32 characters when supplied and distinct from each other and the Supabase secret. Secrets never enter browser code. Node crypto and existing Zod suffice; no runtime dependency is added.

## D-011 — Phase 6 authoritative inquiry identity decisions

**Status:** Accepted by the operator (their D-009/D-010 labels; repository IDs D-009/D-010 already describe Playbook and Experiments).

Contact = person. Lead = inquiry event. One contact may have multiple leads. A matching normalized contact and product is a duplicate when its timestamp is no more than 24 hours after the previous matching inquiry, inclusive at exactly 24 hours. This is a rolling timestamp window, never a calendar bucket. Different products remain separate. Store suppressed submission timestamps on the existing lead so they can advance the rolling window; replaying the same submission does not advance time. Chronologically sort import rows before resolution. If an out-of-order submission would join two already-distinct records or precede a nearby stored inquiry, refuse the ambiguous write with CONFLICT rather than merge history.

Retain inquiries without usable email/phone with contact_id=null and DQ_NO_CONTACT. Never fabricate a person or merge missing identities. Submission replay keys protect retries and identical CSV rows independently of contact identity. No future reconciliation system is implemented.

`dedupe_key` deterministically serializes resolved contact ID, normalized product and the inquiry's UTC anchor timestamp. Rolling observation matching decides membership in that window; no fixed bucket is used. An identityless inquiry uses its submission hash in place of contact ID. Separate SHA-256 submission keys cover manual request UUID retries and canonical CSV row content plus identical-row occurrence ordinal.

## D-012 — Phase 6 persistence and CSV boundaries

Local verification required forward migrations 0012–0015: set-based batch inserts replace per-row statements; JIT is disabled only within the two bounded JSON RPCs; the assembled snapshot is materialized once before fingerprinting to avoid repeated aggregation. The API statement timeout remains unchanged. Existing applied migrations remain immutable. A 5,000-row browser import/reimport is the regression gate. Qualification configuration uses the existing authenticated settings/audit path; changes affect future verdicts only. Tests measure 100% branches across qualification, normalization, lead rules and metric/funnel calculations.

Verification adds exact-pinned @vitest/coverage-v8 matching Vitest 5.0.0, as a development-only dependency, to measure the PRD's 100% branch gate for qualification and metric formulas. Existing Vitest assertions alone do not measure uncovered branches. csv-parse 7.0.2 is exact-pinned; its browser ESM parser is shared by the import preview and server revalidation. No parser or coverage package is loaded by unrelated product routes. Shared DataTable gains an explicit page size and non-sortable identity columns so server pagination remains accurate.

**Status:** Accepted implementation choices within PRD Phase 6.

Use migrations 0010_crm_core and 0011_funnel_views because 0001–0009 are occupied. Create only companies, contacts, leads, lead_stage_events, and deals. Authenticated sessions read through RLS; session-verified, authorized server services write through the existing privileged client inside repositories, as required for mirrors in §15.5. A scoped snapshot and compare-and-swap batch RPC provide atomic persistence for application-computed resolution, deduplication, qualification and stage changes; SQL owns constraints/transactions, not qualification or metric formulas. Serialize CRM batch commits with an advisory lock and retry conflicts with a fresh snapshot. This single-workspace serialization can become per-identity locks if measured contention warrants it.

Store first-touch fields write-once, per-inquiry last touch immutable, qualification evidence/version/settings snapshots, explicit manual overrides, submission keys and observed inquiry timestamps. Leave the future webhook foreign key for Phase 7. Leads have an optional app profile owner distinct from HubSpot owner identifiers. Manual deals are local records and never trigger CRM writes. Preserve numeric(18,2) money and currency from §15; mixed currency is unavailable, not silently summed or converted. Views return aggregate facts only; ratios are exclusively computed by domain/metrics/formulas.ts. Spend facts stay null until Phase 10.

Use csv-parse for standards-compliant quoted/escaped/newline CSV parsing, bounded to UTF-8, 5,000 rows and 5 MB in memory. Increase the server-action body cap only to support this bounded import. Reject structurally invalid CSV before writing; report every row error and commit nothing until all rows are valid. The server re-parses and recomputes the plan at commit and checks the preview fingerprint. CSV content is never saved to storage or logs. Canonical row content (including occurrence timestamp) supplies replay identity; identical rows replay, missing person identities do not merge across distinct inquiries. Contact exports still require mapping an actual inquiry timestamp; no contact-creation date is silently reinterpreted as an inquiry.

## D-010 — Phase 5 experiment lifecycle, priority, and concurrency

**Status:** Accepted

**Phase:** 5

**Decision:** Add the PRD `experiments` and `experiment_results` tables in forward migration `0009_experiments.sql`; migration numbers 0001–0008 are already occupied. Keep lifecycle, scoring, duration, and sample guardrails in `src/domain/experiments/`. PostgreSQL enforces storage constraints and provides three narrow, fixed-search-path security-definer functions: an advisory-locked code allocator for race-safe `EXP-YYYY-NNN` codes, a draft editor, and a row-locked compare-and-swap transition writer so an experiment and its completion result change atomically across concurrent tabs. Every function explicitly requires `auth.uid()` and is executable only by authenticated users. Reads use the authenticated session client and RLS; writes are initiated through the same session and these functions rather than a privileged application client.

The PRD requires backlog priority to be computed from `priority`, `confidence`, and `effort` but does not define the equation or the range for `priority`. Use `(priority × confidence) / effort`, with all three inputs constrained to integers 1–5 and the displayed score rounded to two decimals. This preserves the three named inputs, rewards value and confidence, penalizes effort, is deterministic, and needs no extra setting or dependency. Ties sort by creation time and code. Review dates are business `date` values; day differences use the existing timezone-independent calendar helpers. The minimum-duration and sample rules warn rather than block. If the observed count is below the configured threshold, completion stores `evidence.verdict_label = "inconclusive_by_default"` and `evidence.sample_warning = true`; the operator's recorded outcome remains unchanged so evidence is not rewritten as a statistical conclusion.

`external_refs` is a bounded object containing optional `campaign_id`, `adset_id`, `ad_id`, and `landing_page_url` strings only. No variant table, automated metric attachment, significance calculation, recommendation, integration, or background job is added.

**Alternatives rejected:** application-side `max(code)+1` is race-prone; a permanent sequence cannot reset naturally by year; database-owned lifecycle rules would violate the application's business-logic boundary; adding a scoring dependency or configurable formula is unnecessary for the PRD.

## D-009 — Phase 4 playbook storage, search, and safe Markdown

**Status:** Accepted

**Phase:** 4

**Decision:** Add the single PRD `playbook_articles` table in forward migration `0007_playbook.sql`, followed by `0008_playbook_seeds.sql`; migration numbers 0001–0006 are already occupied. Categories remain a required text field and tags remain a text array. No category, revision, attachment, collaboration, or content-block table is added.

PostgreSQL owns text indexing and ranking through a stored generated weighted `tsvector`, a GIN index, and one security-invoker read RPC. The RPC accepts only validated search/filter values and excludes archived articles unless explicitly requested. Application domain logic owns slug generation/collision suffixes and publishing semantics. Drafts start at version 0; every save whose resulting status is `published` is a publish and increments the version, including edits to an already-published article. Publishing sets `published_at`; later archive preserves it. Updates use the row's `updated_at` as a compare-and-swap revision so two editors cannot silently overwrite each other. Delete is a confirmed hard delete because the PRD explicitly requires delete and defers revision history.

Use `react-markdown` 10.1.0 with `remark-gfm` 4.0.1, both exact-pinned. This is the minimum maintained parser combination that renders the PRD's headings, lists, tables, task checkboxes, and code without a home-grown Markdown parser. Raw HTML is never parsed (`skipHtml`); the renderer never uses `dangerouslySetInnerHTML`, and external input still passes Zod validation. This safely removes injected HTML without adding `rehype-raw` or a broader HTML sanitizer attack surface. Links retain the renderer's safe URL transformation. The cost is the parser bundle on playbook routes; route-level splitting contains it to those routes.

**Alternatives rejected:** hand-written Markdown parsing is incomplete and unsafe; `remark-rehype` plus raw HTML and a sanitizer adds dependencies and an HTML path the product does not need; a generic CMS schema adds speculative structure prohibited by the PRD.

## D-008 — Phase 3 handoff and workflow consistency

The operator explicitly authorizes Phase 3 while Phase 2 retains five residual verification items in TASKS.md. This overrides sequencing only; it does not weaken authentication/security or mark unverified gates PASS.

Add the four PRD Phase 3 tables in `0005_workflows`, followed by `0006_workflow_seeds`; versions 0001–0004 are already applied. Keep normal operations on authenticated session clients with RLS. Small security-invoker RPCs provide atomic run/items insertion and compare-and-swap item/run writes. They persist application-computed values and enforce storage consistency; cadence, date selection, progress, and status rules remain exclusively in the domain layer. This avoids partial runs and lost concurrent updates without a new database client or service-role shortcut.

Snapshot required/help/order with each item and template name/version with each run, alongside the PRD label snapshot: edits must not reinterpret an existing checklist. History is retained; deactivation is the template removal operation. A run with no required steps completes when all its optional steps are done; otherwise required steps determine completion. Progress is the share of those completion-driving steps that are done. Templates require at least one step. Monthly cadence uses the first Monday–Friday date (no holiday calendar is specified); weekly cadence uses the selected weekdays. Existing runs remain accessible after deactivation; missing past days are never materialised.

Use native `Intl.DateTimeFormat` with explicit Asia/Jakarta and UTC calendar-only arithmetic for the four named date helpers instead of adding `date-fns-tz` and its peer dependency. This is a deliberate implementation substitution, tested at midnight, ISO week/year boundaries, leap years, month edges and under different process timezones. No new runtime dependency. New product UI copy is Bahasa Indonesia, inside the existing approved English navigation/shell.

Phase 3 production verification exposed same-render GET memoization: the read after materialization reused the earlier empty run list. Workflow reads used by mutation/retry coordination (`readRuns`, `readRun`, `readTemplates`) supply independent AbortController signals to opt out of request memoization. This preserves read-after-write consistency without altering the shared authentication client or disabling caching application-wide. Verified against installed Next.js `dedupe-fetch.js` and [official fetch documentation](https://nextjs.org/docs/app/api-reference/functions/fetch). The production regression requires the checklist on its first visit, before performance reload samples.

## D-007 — Current Supabase API keys (Phase 2 deployment recovery)

**Status:** Accepted, explicitly authorized by the operator. This updates the key names in D-001, D-006 and the legacy examples in PRD NFR-G4/section 38; all other security and data-ownership rules remain authoritative. The only public application variables are now `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SECRET_KEY`, `APP_ENV`, `APP_BASE_URL` and `APP_TIMEZONE` remain server-only. `NEXT_PUBLIC_APP_ENV` remains prohibited. There is no silent legacy-key fallback.

Installed `@supabase/supabase-js` 2.116.0 explicitly handles modern key formats and `@supabase/ssr` 0.12.7 forwards the configured key to that SDK. This matches [Supabase API-key guidance](https://supabase.com/docs/guides/getting-started/api-keys) and [SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client). No package upgrade is required. Environment validation checks the key's public/secret format, fails with variable names rather than values, and does not claim to verify remote key validity.

Browser and server session clients use the publishable key; normal operations still carry the authenticated user's session and remain subject to grants/RLS. Only the guarded server admin client consumes the privileged secret. Database roles (`anon`, `authenticated`, `service_role`) and existing migrations/policies do not change. Tests use only the local CLI's modern publishable/secret keys; no remote privileged credential is copied into source, documentation or local files.

All six core variables must be configured for a Vercel build/runtime. `APP_ENV` describes the actual Vercel target (`preview` or `production`); a Production-target deployment using the development Supabase project still uses `production`, keeping the development gallery inaccessible. `APP_BASE_URL` is that target's canonical HTTPS application origin; the business timezone stays `Asia/Jakarta`. Future integration variables remain unset until their owning phase.

## D-006 — Phase 2 authentication and settings foundation

**Status:** Accepted implementation choice within PRD §17. Use invite-only email magic links, mandatory email verification, and `@supabase/ssr` 0.12.7 with `@supabase/supabase-js` 2.116.0. Auth runs on the server with HttpOnly, Secure, SameSite=Lax cookies; the anonymous browser client does not manage the session. `src/proxy.ts` is the installed Next.js 16 replacement for middleware. Protected data reads and server actions independently validate the session. `/auth/confirm` is the sole new public callback, authenticated by a single-use Supabase email token; redirect destinations are restricted to internal application paths.

Local public signup is disabled through versioned Supabase configuration. Remote dashboard signup, email templates, redirect allowlists, SMTP, and host deployment protection require verification on the supplied development projects; local evidence is not remote evidence.

Remote configuration evidence (2026-09-12): authenticated CLI readback confirms public signup disabled and Email provider enabled on development project `oonxnzogzzciszojract`. After operator-managed custom SMTP setup, both checked-in token-hash email templates were applied and matched remote contents on a second, no-change CLI invocation. Site URL and callback allowlists match the canonical Vercel origin `https://growthcockpitdyrn.vercel.app` and the documented localhost callbacks. This verifies configuration only; delivered-email authentication and other deployment gates remain pending in `TASKS.md`.

Deployment sequencing repair (2026-09-12): remote inspection found Auth provisioned before migrations, leaving the existing account without a profile. Forward-only `0004_identity_backfill` fills missing profiles for existing Auth users using exactly the provisioning trigger's name normalization and database defaults; it leaves existing profiles unchanged and never trusts role metadata. This completes FR-2.4 for accounts predating the trigger without changing authorization or introducing a new feature.

CLI 2.117 maps `auth.email.enable_signup` to email-provider enablement; it stays true so invited users can sign in. The global `auth.enable_signup=false` maps to `GOTRUE_DISABLE_SIGNUP=true` and blocks registration; the browser test verifies this directly.

`app_settings` is operational workspace configuration: authenticated read/write RLS matches the PRD's single-operator operational baseline. Database triggers set audit metadata; profile role and settings identity/description are not browser-writable. Provisioning ignores user-supplied role metadata and assigns the PRD default owner role. `can(action)` centralizes authorization; future role-specific behavior is deferred.

Phase 2 exposes profile name and the fixed Asia/Jakarta workspace timezone (`workspace.timezone`). Explicit PRD defaults for future qualification, HubSpot lifecycle writeback, attribution, and health settings are seeded and validated but have no feature behavior or editing UI until their owning phases. Unknown settings are ignored with a warning; malformed known values use the documented default. Warnings are shown in Settings; no Phase 9 alert subsystem is introduced.

Metrics, experiment duration, job limits and follow-up SLAs are also seeded from the PRD. The PRD supplies the SLA values but no key names; use `follow_up.mql_workdays` and `follow_up.sql_workdays` (2 and 3). A forward-only `0003_identity_defaults` completes defaults after `0002_identity` was applied; future phase migrations must use the next unused sequence rather than overwrite either migration. No future feature behavior is activated.

## D-005 — Phase 1 interface foundation

**Status:** Accepted. Light mode only for MVP, as PRD §13.4 specifies. Use a compact neutral workspace with a deep green navigation rail, restrained green action accent, and four semantic status palettes. All values are centralized in `src/styles/tokens.css`. System fonts avoid a network dependency. Static route content remains server-rendered; only navigation state, filters, tables, and overlays require client interaction.

Use the required shadcn/ui Radix primitives for accessible overlays and controls, with their generated source adapted to the token system. Add `class-variance-authority` 0.7.1 for primitive variants, `radix-ui` 1.6.7 for accessible controls, `sonner` 2.0.8 for the required toast, and `@axe-core/playwright` 4.13.0 for TEST-1.2. No application service, table, integration, or business rule is added. The gallery is allowed only when server-side `APP_ENV=development`; preview and production return 404. This is a presentation sandbox, not a deployment.

## D-001 — Public environment contract

**Status:** Accepted; API-key variable names are superseded by D-007. The server-only APP_ENV decision remains unchanged.

**Phase:** 0

**Decision:** `APP_ENV` is server-only and accepts `development`, `preview`, or `production`. `NEXT_PUBLIC_APP_ENV` does not exist. The only public application environment variables are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If the UI displays the environment, a Server Component passes only the non-sensitive parsed value to presentation.

**Reason:** This is the human-approved clarification of conflicting text in PRD v3.0.

## D-002 — Pinned foundation toolchain

**Status:** Accepted

**Phase:** 0

**Decision:** Use npm with Node 24.14.1 and exact package versions in `package.json` and `package-lock.json`. Use Next.js App Router, strict TypeScript, Tailwind CSS 4, default shadcn/ui configuration, ESLint flat config, Prettier, Vitest, Playwright, Zod, and the project-local Supabase CLI. TypeScript 6 and ESLint 9 are pinned to the newest releases supported by the Next.js 16 lint toolchain; their newer major releases currently violate peer constraints.

**Reason:** Exact pins make clean installs and CI repeatable. These are the technologies required by the PRD; no application framework or service was added beyond that set.

**Dependency baseline:** 22 direct packages (8 runtime, 14 development), 561 resolved lockfile entries, and 450 packages audited by the final clean install. shadcn/ui is source-based, so its CLI is not retained as a project dependency after verifying the configuration; keeping it would add unused maintenance surface.

## D-003 — Repository and CI bootstrap

**Status:** Accepted

**Phase:** 0

**Decision:** Initialize a local Git repository on `main`, configure a repository-local secret-scanning pre-commit hook, and commit a GitHub Actions workflow. When no authenticated remote repository or remote runner is available, verify the same commands locally and report remote CI as externally unverified.

**Reason:** The human-approved Phase 0 clarification makes these foundations Phase 0 deliverables and prohibits fabricated remote evidence.

## D-004 — Minimal Phase 0 shadcn/ui state

**Status:** Accepted

**Phase:** 0

**Decision:** Initialize shadcn/ui metadata and its standard utility dependencies but add no generated UI component or custom design token.

**Reason:** Phase 0 requires shadcn/ui to be ready while the design system and component patterns belong to Phase 1.
