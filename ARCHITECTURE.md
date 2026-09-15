# Architecture

## Phase 11 decisions and Today v2

`domain/metrics/decision-inputs` validates bounded raw projections, resolves campaign identities with the Phase 10 helper, reuses Phase 6 formulas, and builds current/comparison and mature-cohort windows. `domain/rules` contains eleven pure r1 rules, precedence and priority scoring; it imports only its own directory. Missing/stale/mixed-currency inputs are explicit. Target CPQL is nullable business configuration: only R-02/R-05 depend on it, per the operator's D-018 clarification. Frequency and verified lead-generation campaign IDs also have honest unconfigured states.

`services/decisions` coordinates facts, evaluation and persistence under the existing Phase 7 lease. Each bounded batch commits immutable evaluations and action records with its resume cursor in `sync_state(decisions,evaluation)`, so job finalization/recovery cannot erase committed progress. Resumption preserves the evaluation clock; changing the rule version or relevant settings starts a fresh cycle and retains earlier evidence. Completed cycles resolve retired conditions. Only R-06 is Slack-eligible, using the existing Phase 9 transport and its safe projection; all campaign actions remain advisory.

Authenticated Server Components render Today priority actions, grouped settings and a 20-row URL-filtered campaign history. Client forms submit validated and authorized Server Actions for thresholds, snooze and dismiss. Settings retain old/new values and actors; action writes compare revisions. Snooze expiry is handled before reading priority cards, preventing an old-revision race with the existing Alerts section. Priority and evidence use shared cards, native disclosure/forms and semantic tokens. Existing checklist, lead queue, experiment review, notes and health remain intact. A recommendation links to existing Playbook content and can prefill the campaign reference in a new experiment.

D-018 specifies exact priority decay/normalization, sample precedence, stable-day evidence and material worsening. The factual projection has an explicit 10,000-group ceiling per family and fails visibly on overflow; each commit evaluates at most forty scopes. No dependency, public route, new queue, provider write, AI or Phase 12 reporting behavior is introduced. A11 approval and week-long operator observation remain operational evidence, separate from engineering checks.

## Phase 10 Meta performance

The read-only Meta adapter uses pinned Graph v26.0 and validated campaign-grain insights. `services/ad-metrics` coordinates the existing job runner, provider validation, and `repositories/ad-metrics`; the atomic page RPC fences each write using the existing job lease and commits its resume cursor with its rows. A failed date retains prior good rows and its exact account/date/page position. The failure RPC is fenced too, so an expired worker cannot overwrite newer progress. No provider call occurs while rendering Today, Performance, or Integrations.

`domain/metrics/performance` owns identity resolution, currency refusal, cohort aggregation, reconciliation and display semantics; it reuses the sole formula module. PostgreSQL groups raw components before transfer, avoiding the PostgREST row limit and any join that multiplies spend. Campaign IDs win over labels; an ambiguous name or unknown platform never acquires Meta attribution. Performance renders the same shared shell, MetricCards, DataTable, URL filters, and server pagination. D-017 records the native accessible SVG substitution and the two required tables. Phase 10 itself adds no Meta writes or decision rules; the Phase 11 layer above consumes these facts.

Meta health conditions use Phase 9 alert keys/lifecycle and Slack dispatch; the Phase 7 runner remains the only job entry point. The opt-in GitHub scheduler triggers daily at 06:00 WIB and follows resumable batches with a bounded overall deadline. Real credentials, host protection, scheduler timing and one-week use remain separate external/UAT evidence.

## Phase 9 alerts and Slack

Alert policy is deterministic application logic in `src/domain/alerts`: stable keys, severity, channel routing, quiet hours, per-day caps, digest grouping, retry classification and scheduler-overdue rules. `src/services/alerts.ts` is the shared producer boundary for Phase 6 lead/deal changes and Phase 8 CRM mirrors. `src/services/alert-jobs.ts` coordinates persisted facts, lifecycle reconciliation and delivery. Route pages and controls remain presentational; Supabase access stays in `src/repositories/alerts.ts`, and the Slack transport stays in `src/integrations/slack/client.ts`.

The alert row is the first-class durable record. PostgreSQL serializes raises for a deterministic key and owns atomic lifecycle/delivery transitions. Repeated evaluation refreshes one unresolved alert and increments its occurrence count; condition jobs resolve absent keys with an explicit `condition_cleared` reason. Authenticated users may read alerts through RLS. Only narrow service-role RPCs mutate them after an authorized server action or trusted job invocation. Alert production is best-effort after the producing transaction, so a Slack or alert-storage outage cannot roll back an inquiry or CRM mirror.

`JOB-STALE-LEADS`, `JOB-DATA-HEALTH` and `JOB-NOTIFY-DISPATCH` reuse the Phase 7 registry, lease, deadline and batch controls. Slack receives an allowlisted projection of type, severity, non-PII identifiers, counts, reason codes and an internal link. Delivery failure is recorded independently and retried; exhaustion creates an in-app-only alert. The existing opt-in GitHub scheduler is the deployment fallback because high-frequency native Vercel Cron remains unverified. No broker, public alert endpoint, new dependency, n8n runtime or Phase 10 producer is introduced.

## Phase 8 HubSpot CRM integration

HubSpot owns CRM lifecycle, contact identity/owner and deal state; PM OS owns inquiry qualification/override and attribution. D-014 protects overridden inquiries independently from the contact CRM mirror. The pure record-to-row planner in `domain/hubspot.ts` owns ownership, ambiguity, qualification propagation and attribution stamping. `services/crm-sync.ts` coordinates it with the fixed-origin HubSpot transport and repositories; components remain presentational. This is the BE-8.3 transform implementation location recorded in D-015.

Reuse Phase 7 durable events, run claims, retry classification and leases. `JOB-HUBSPOT-RECONCILE` resumes bounded modified-time windows; outbound work uses one workspace lease. `commit_hubspot_mirror` supplies atomic writes, row revision checks, claim fencing and immutable override protection. No new tables, dependency, CRM, queue broker or scheduler runtime. Mapping changes use authenticated settings writes with audit; privileged clients serve trusted machine coordination only. Warning candidates appear in existing health/run UI; Phase 9 alert delivery is untouched. No remote connection or cadence is asserted from local fixtures.

## Phase 7 integration and job foundation

The signed ingress boundary verifies raw-byte HMAC, timestamp, size/media limits and idempotency before coordinating the existing Phase 6 lead service. Authenticated invalid input is auditable; invalid signatures never retain a body. Durable acceptance precedes `after` processing. Queue claims and atomic lead/event finalization use a fencing token; crashed workers are recoverable without duplicate inquiry creation. Machine actors are null, with source_event_id provenance; manual operations still require the verified user and `can`.

The three plumbing tables have authenticated read RLS and privileged repository writes. SQL provides locks, claims, constraints and atomic storage; HMAC, Zod, retry classification/backoff and job budgeting are application code. `integration_runs` supplies both attempt history and the per-job running lease; transaction advisory locking makes acquisition safe with PostgREST pooling. No broker, lock table, external workflow engine, pg_cron/pg_net, or new runtime dependency is introduced.

At Phase 7 closure only JOB-RETRY-EVENTS was registered; Phase 8 adds JOB-HUBSPOT-RECONCILE as documented above. Bearer-authenticated scheduler POST/GET and same-origin session-authenticated manual POST share one bounded runner. Server actions also verify session/authorization. Scheduled calls require production + JOBS_ENABLED; the GET adapter cannot use cookies. `/api/health` exposes only status/version/commit/database reachability. The proxy exempts only these three machine endpoint paths; each boundary authenticates independently.

The operator selected Apps Script first and prohibited assuming Vercel Pro. The repository keeps native cron empty for Hobby compatibility, declares the cadence in the registry, and supplies an opt-in GitHub Actions fallback. Deployment cadence/source registration are separate infrastructure evidence; no remote setup or scheduler activation is implied. See D-013 and INTEGRATIONS.md. Existing Phase 2 verification gaps and Phase 3–6 UAT remain open.

`/integrations` and Today render actual job health, last-run/success evidence, server-paginated runs, dead letters and rejection metadata. Shared DataTable, health cards, drawer, buttons and toast feedback preserve the shell. Payloads and secrets are never sent to these components. Critical conditions are candidates from durable state only; Phase 9 will deliver alerts. No Phase 8 connector is implemented.

## Phase 6 vertical slice

Lead pages/actions → session and `can("lead:write")` → Zod input → domain normalization/resolution/q1/attribution → repository snapshot and atomic commit. Manual entry and CSV import share `prepare`/`planLeads` and the same commit path. Deal coordination is colocated in the lead service/repository because the transaction also links its inquiry; no additional service abstraction is needed. Override and deal updates reject stale revisions. User-facing errors omit PII; diagnostic logs contain only database error codes.

The five CRM mirrors follow PRD §15.5/Phase 6: authenticated reads through RLS, privileged repository writes only after server authorization. This exception does not change settings, auth, workflow, playbook, or experiment access patterns. SQL enforces constraints, atomicity, uniqueness and immutable history; q1, the 24-hour dedupe window, SLA workdays and metric equations remain pure application domain rules.

Native forms and the approved shell serve the 20-row server-paginated lead registry, inquiry editor, timeline/override/manual-deal detail, in-memory CSV workflow, cohort/activity funnel and Today follow-up queue. URL parameters own filters. Settings expose only Phase 6 qualification inputs in addition to existing profile/preferences. Spend-dependent metrics remain unavailable. No integration, scheduler, automatic ingest, Phase 7 feature or campaign modification is implemented.

Campaign/activity tables and stage history also use 20-row server pages. Funnel totals are computed from all paged database facts before the presentation page is selected, so pagination never changes metric denominators. Timeline pagination prevents the database API's row cap from silently omitting older changes.

## Authority and system shape

The Master PRD in `PRD.md` is authoritative, with the explicit operator API-key clarification recorded in D-007. Du Anyam Performance Marketing OS is a single Next.js application deployed on Vercel with Supabase for PostgreSQL, authentication, and storage. The browser uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Privileged database access and all external API access remain server-side.

The PM OS owns operational business logic. HubSpot is the CRM source of truth for contact and lifecycle data. Supabase is the PM OS operational database and analytics mirror. External systems transport or store data; they do not define PM OS business rules.

## Layer boundaries

| Layer              | Responsibility                                                 | Must not contain                                           |
| ------------------ | -------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/app`          | App Router pages, layouts, route handlers, server entry points | Reusable business rules                                    |
| `src/components`   | Presentational React components                                | Business rules, direct database access, external API calls |
| `src/domain`       | Pure entities, invariants, deterministic rules                 | Framework, database, or vendor dependencies                |
| `src/services`     | Use-case coordination and transaction orchestration            | Rendering code or vendor transport details                 |
| `src/repositories` | Supabase queries and database/domain mapping                   | External API calls or presentation logic                   |
| `src/integrations` | External API and webhook adapters                              | Ownership of PM OS rules                                   |
| `src/lib`          | Small shared technical helpers and environment access          | Feature-specific business rules                            |
| `src/types`        | Shared technical and generated database types                  | Runtime behavior                                           |
| `src/config`       | Static configuration and validation schemas                    | Secrets or feature logic                                   |

Dependencies flow from app entry points through services to domain, repositories, and integrations. Server-only modules use `import "server-only"`. Client code may import only the public environment module.

Normal server requests also use the publishable key together with the authenticated user's session, preserving RLS. `SUPABASE_SECRET_KEY` is consumed only by the guarded privileged admin client (plus isolated Node test infrastructure), never by user settings/auth repositories as an authorization shortcut. Modern keys are passed to the installed SDK without custom transport or JWT conversion. `APP_ENV`, `APP_BASE_URL` and `APP_TIMEZONE` remain server-only; all six core variables are mandatory. Legacy variable names are not aliases.

## Frontend strategy

Phase 0 provides App Router, React, Tailwind CSS, and default shadcn/ui configuration plus a plain placeholder. Phase 1 establishes the design system and responsive shell before feature work. Later features are vertical slices through the established layers. The frontend presents decisions and workflows; it does not calculate authoritative business outcomes.

Phase 1 implementation: `src/styles/tokens.css` owns the light-mode token system. `src/components/ui/` contains shadcn/Radix primitives; shared operational components sit in `src/components/`. `src/config/navigation.ts` is the shared navigation and breadcrumb source. The `(app)` and `(auth)` route groups are ready for Phase 2 protection without route restructuring.

Static skeleton content is rendered on the server. The shared shell's navigation/drawer, date-range form, and gallery interaction examples are client islands. URL parameters hold filters; no business data is fetched. `/dev/gallery` checks server-only `APP_ENV` on every request and returns 404 outside development. The gallery's illustrative records are never imported by product route skeletons.

## Backend and database strategy

Phase 2 adds invite-only magic-link authentication. `src/proxy.ts` refreshes cookies and verifies the user with Supabase Auth on each protected request. The `(app)` layout and settings actions independently require a verified user. Cookies are HttpOnly, Secure and SameSite=Lax; the browser Supabase client is anonymous and does not manage sessions. The server-only admin client is never imported by browser components. Auth transport and database queries stay in repositories, actions coordinate in services, and forms render input/state only. `can(action)` is the sole role check.

`/auth/confirm` validates the Supabase one-time email token and restricts `next` to internal application routes. All redirect origins come from the trusted server-only `APP_BASE_URL`. Protected responses are private/no-store. Settings inputs are Zod-validated; invalid input remains visible and failed writes do not report success. Missing profiles and malformed settings have recoverable UI states. No future feature is activated by seeding its documented configuration default.

Route handlers and scheduled endpoints are thin boundaries. Services coordinate use cases. Domain modules implement deterministic logic. Repositories are the only layer that accesses Supabase. Schema changes are forward-only SQL migrations. Every future table in `public` must enable RLS and define policies in the same migration.

Phase 0 creates no product tables. Its only database change enables `pgcrypto` and `citext` and defines the shared `public.set_updated_at()` trigger function.

## Runtime and sequencing

Asia/Jakarta is the business timezone. Currency storage, conversion, attribution, lead/contact meaning, funnel calculation, and decision rules follow the PRD and are implemented only in their owning phases. Scheduled jobs run only in production after their phase is complete. n8n is not part of the current runtime.

One phase must pass its documented gate before work begins on the next phase, except the explicit Phase 2 handoff authorizing Phase 3 while retaining its five external verification gaps (D-008).

## Phase 3 Today / Daily Workflow

`domain/dates` uses explicit Asia/Jakarta formatting and UTC calendar arithmetic for date-only operations; `domain/workflows` owns cadence, snapshots, completion and status. Today uses the server clock, independent of the global reporting range, and never backfills missed dates. The monthly schedule uses the first Monday-Friday date; no holiday calendar is assumed.

Authenticated services coordinate lazy run materialization, checklist changes, quick notes and template edits. Repositories use the existing user-session client and RLS. Security-invoker RPCs provide atomic persistence only: unique template/date materialization and compare-and-swap item/run writes. Cadence, required-step completion and timestamps are calculated in application domain/services. Conflicts retry using freshly read state, at most three attempts. Template saves compare their version to reject stale edits.

Today and workflows pages remain Server Components. Interactive shared checklist/template components render data and submit validated server actions; no component reads Supabase or decides authoritative run status. History is restricted to the last 30 business dates with server pagination (10 rows); dated notes use 20-row pages. Historical run labels, help, order, required flags and template name/version are snapshots. Removing a template step affects future runs only; deactivating a template preserves existing runs. Failed writes retain drafts and display retry feedback. No scheduler, integration or Phase 4 capability is introduced.

## Phase 4 Playbook / SOP

`domain/playbook` owns slug, publish/version, tag-normalisation and Markdown-heading rules. `services/playbook` validates list and write inputs, checks authorization, coordinates collision retries and publication state, and exposes only view-ready records. `repositories/playbook` is the sole Supabase boundary. All normal reads and writes use the authenticated session with RLS; the privileged client is not used.

`playbook_articles` is one shared-workspace table. Categories are required text and tags are a bounded text array; no speculative CMS, category, revision, attachment or collaboration schema exists. A stored weighted `search_vector` and GIN index support the security-invoker `search_playbook` RPC. Search ranks title above summary/tags above body, applies URL-backed type/category/tag/status filters, paginates in 20-row pages, and excludes archives unless explicitly requested. Updates and deletes compare `updated_at` so concurrent edits fail rather than overwrite.

Playbook pages remain Server Components. The editor alone is client-side so a failed server action preserves its buffer and its safe preview. `react-markdown` renders GFM with raw HTML disabled; no rendered article path uses `dangerouslySetInnerHTML`. Archived deep links remain readable with an explicit banner. The feature adds no external integration, scheduler, AI, attachment, collaboration or Phase 5 behavior.

## Phase 5 Experiment OS

`domain/experiments/state.ts` owns the lifecycle transition table, backlog score, calendar-day timing, minimum-duration warning and sample-evidence label. `services/experiments.ts` validates use-case input, checks authorization, reads the two typed settings, and coordinates repositories. `repositories/experiments.ts` is the only Supabase boundary. React components call pure domain helpers for immediate presentation but never decide or persist authoritative status or evidence.

`experiments` stores the test plan and its `EXP-YYYY-NNN` code; `experiment_results` stores one terminal evidence record. A per-year PostgreSQL advisory transaction lock makes code allocation race-safe without a sequence table. Authenticated users can read shared workspace experiments through RLS but cannot write the tables directly. Three narrow fixed-search-path functions create, edit drafts, and commit transitions. The transition function locks the row and compares `updated_at`; completion inserts its result and changes lifecycle in one transaction. Domain validation remains authoritative while database constraints prevent incomplete evidence and invalid persisted states.

The backlog is ordered by `(priority × confidence) / effort`, then creation time and code. Duration and sample thresholds come from validated `app_settings`; warnings do not block saves. Small samples preserve the operator outcome and store the explicit `inconclusive_by_default` label in evidence. The learning library uses the result table's generated full-text vector and GIN index; variable, KPI, outcome, status and page filters remain in URL parameters. Today queries indexed running experiments whose review business date is due in Asia/Jakarta. No scheduler is involved.

Experiment routes remain Server Components. The editor and lifecycle dialogs are focused client islands that retain pending input and submit validated server actions. No external integration, automatic metric attachment, statistical significance, recommendation, multivariate model, job, AI, or campaign modification exists in this phase.
