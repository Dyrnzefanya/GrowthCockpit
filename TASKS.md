# Tasks

## Phase 9 — Alerts & Slack

**Status: PASS — ENGINEERING COMPLETE (local). Operational / external activation: PENDING. Phase 10 is not authorized.**

### Implementation plan

- [x] Read Phase 9, §§20–21 and the existing Phase 6–8 producer/job/UI paths; record D-016 before adding schema/services.
- [x] Add the forward-only alerts migration, RLS, atomic dedupe/lifecycle/delivery functions and regenerated types.
- [x] Implement deterministic alert policy, Phase 6–8 producers, Slack allowlist transport and the three bounded jobs through the existing runner.
- [x] Activate Today alerts/detail actions and Integrations notification-volume evidence without redesigning either route.
- [x] Complete TEST-9.1–9.10, database/RLS, responsive/axe, secrets, build and diff-review evidence.

### Engineering gates

- [x] FR-9.1–FR-9.12; NFR-9.1–NFR-9.3; BE-9.1–BE-9.6; FE-9.1–FE-9.3; JOB-9.1–JOB-9.3. INT-9.1 code/config contract is complete; external workspace/channel provisioning remains below.

### Requirements and acceptance evidence

| Requirements                                | Implementation / evidence                                                                                                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-9.1–9.3; BE-9.1–9.3; TEST-9.1–9.3        | Migration `0022_alerts.sql`, partial active-key uniqueness, advisory-key serialization, occurrence refresh, audited acknowledge/snooze/resolve/reactivate and `condition_cleared` sweep. Ten concurrent raises produce one row and ten occurrences.                            |
| FR-9.4–9.8; BE-9.5/9.6; TEST-9.4–9.7        | D-016 routing, WIB daily cap, >5/category/hour digest, stale daily digest, 07:00–20:00 INFO window, notification counts and strict Slack allowlist. Native fetch implements bounded timeout/rate-limit/network retry without reading provider bodies.                          |
| FR-9.9/9.10; FE-9.1/9.2                     | Today shows only open alerts grouped by severity. Authorized acknowledge and snooze persist, immediately leave Today, and retain history; detail exposes trace IDs, safe evidence and playbook links.                                                                          |
| FR-9.11; NFR-9.3; TEST-9.8                  | Alert creation is best-effort after the lead/CRM transaction. Delivery state, retry time and terminal non-recursive in-app failure are separate from the producer; Slack is never called on the lead path.                                                                     |
| FR-9.12; BE-9.4; JOB-9.1–9.3; TEST-9.9/9.10 | Stale-lead, data-health and notify jobs reuse the Phase 7 bounded runner/lease. Health checks dead letters, failure streaks, unmapped values, attribution coverage, recovery and >2-cadence scheduler silence. Every registered Phase 9 job is repeatable in the runner tests. |
| NFR-9.1/9.2; FE-9.3                         | A bounded 500-condition day-health evaluation completes below 10 seconds in the test gate. `/integrations` shows actual sent counts by WIB business date/type and never treats configuration as delivery.                                                                      |
| INT-9.1                                     | Server-only env-specific Incoming Webhook contract and opt-in scheduler binding are implemented. Actual Du Anyam Slack app, `#pm-alerts`, `#pm-alerts-dev`, webhooks and deployed cadence remain operational evidence.                                                         |

### Engineering evidence

- [x] Clean local schema applies migrations 0001–0022; schema lint reports no errors. Sequential SQL/RLS suite passes, including alert table/RPC grants, lifecycle/delivery and concurrent dedupe. Generated types include the Phase 9 schema.
- [x] Formatting, ESLint, strict TypeScript and 92/92 unit/service tests pass. Focused alert/Slack/runner tests cover TEST-9.1–9.10, one eligible MQL → one send, bounded health evaluation and delivery exhaustion.
- [x] Whole-app Playwright passes 21/21 in 1.8 minutes with real local invite-only auth. Phase 9 covers persisted acknowledge/snooze, detail/history, notification volume, 390/1280/1920 rendering and axe with zero A/AA violations. Test workers are bounded to three locally/two in CI after six workers saturated the shared local database during the existing 5,000-row import.
- [x] Production build and production browser gates pass 4/4: gallery protection, shell paint, signed-ingest p95 16.3 ms, 50k-lead pages 308–336 ms and 90-day Today loads 546–633 ms. Repository secret scan, configured-secret client artifact scan and npm audit (zero vulnerabilities) pass.
- [x] Rendered Today screenshots at 390/1280/1920 were reviewed: severity hierarchy, alert actions, drawer trigger, responsive wrapping, navigation, typography and overflow remain sound. No sidebar redesign or fabricated product data.
- [x] Scope review confirms Phase 9 only: one alert table, Slack outbound adapter, three registered jobs, Today/Integrations surfaces and Phase 6–8 producers. No Meta, Phase 10, interactive Slack, Events API, email/WhatsApp delivery, AI, n8n or campaign modification.

### Operational / UAT gates

- [ ] One week of real operation with no duplicate notifications and no missed critical condition. Do not substitute fixtures for this evidence.
- [ ] Slack workspace app, separate `#pm-alerts` / `#pm-alerts-dev` Incoming Webhooks and actual scheduler cadence are configured and verified externally (A4 and existing scheduler precondition).
- [ ] Send one real MQL through the deployed source and verify exactly one PII-free Slack message, plus one-week operation with no duplicate notifications or missed critical condition. Fixtures do not satisfy this evidence.

## Phase 8 - HubSpot CRM Integration

**Status: PASS - ENGINEERING COMPLETE (local). Operational / external activation: PENDING.** Phase 9 is recorded above; engineering and operational evidence remain separate.

### Engineering requirements and traceability

- [x] Read Phase 8, ownership section 16, integration contract 18, mapping/write-back 19, attribution 23.3 and A1-A3. Inspect Phase 6 resolution/override/deals and Phase 7 queue/runner before implementation. Contact=person; Lead=inquiry; multiple inquiries per person.
- [x] D-014 resolved: manual disqualified inquiry remains disqualified after HubSpot SQL lifecycle change. Mirror raw lifecycle independently, preserve override/audit metadata and surface divergence. D-015 records adapter/mirror decisions before implementation.
- [x] FR-8.1 / BE-8.1 / NFR-8.3: server-only fixed-host client, bounded retry, Retry-After, throttling, deadlines, allowlisted writes and sanitized errors. No dependency added.
- [x] FR-8.2-8.3 / BE-8.2-8.3: Zod mapping, portal/property metadata validation, raw unmapped values and named WARNING/CRITICAL candidates. Pure transform is domain/hubspot.ts per D-015. No provider IDs guessed.
- [x] FR-8.4-8.6 / BE-8.6: queued contact creation/update and company association, stable local bindings, fill-empty first touch, approved MQL properties and lifecycle flag off by default. Serialized outbound creation; ambiguous creates parked. Reconcile recovers CSV and interrupted enqueue from durable lead revisions.
- [x] FR-8.7 / BE-8.4-8.5: thin HubSpot endpoint, raw v3/v1 signatures, payload limits, portal validation, durable event identity, Phase 7 claims/retries and atomic mirror/event completion.
- [x] FR-8.8 / JOB-8.1 / NFR-8.1: bounded 30-minute reconcile target, five-minute overlap, fixed window/page/remaining-ID cursors, resumable failures and opt-in scheduler binding. Actual deployed cadence remains separately pending.
- [x] FR-8.9-8.11 / BE-8.4: stable-ID resolution, explicit inquiry linkage then unambiguous contact fallback, source timestamp/history, retained unlinked/archived records and ambiguity refusal.
- [x] FR-8.12 / FE-8.1-8.3 / NFR-8.2: integration health/cursor/runs, mapping validation/audit, manual record/date re-sync, lead CRM deep link/owner/divergence and Today data health. No provider calls during page rendering.
- [x] FR-8.13 / BE-8.7: existing Phase 6 attribution helpers stamp and preserve won allocations. Same-qualification CRM deal audit entries cannot inflate activity-funnel counts.
- [x] Forward migrations 0019-0021 applied locally; no new table, machine RPC restricted to service_role, existing RLS retained. Types regenerated for local 0001-0021; remote database unchanged.

### Engineering tests

- [x] TEST-8.1-8.3, 8.5-8.9: committed synthetic transforms, D-014 all-field preservation, actual-history timestamps, partial/ambiguous/unmapped/out-of-order/archive handling, same-revision manual re-evaluation, won attribution, malformed mapping, raw signature/tampering/stale/downgrade, rate limit and sanitized failure tests.
- [x] TEST-8.4 / 8.11: `npm run test:hubspot` mocks only HubSpot HTTP with real local Supabase persistence/queue: double reconcile, retry after 503, write-once attribution, won/partial deal and bounded 1,000-record reconciliation. No remote CRM data used.
- [x] SQL suites for Phases 2-8, migration list, schema lint and generated types pass. Machine RPC grants, unchanged override, independent lifecycle, CAS, prior RLS/concurrency retained. Known non-fatal CLI MaxListenersExceededWarning during successful type generation.
- [x] Lint and strict TypeScript pass; 77 unit tests in 18 files pass. Phase 6 qualification/metric regression retains 100% branch coverage (159/159).
- [x] Real local integration test passes: D-014, same-version replay, transient provider failure through the queue, new Contact/Company creation exactly once, association and stable local bindings, fill-empty attribution, default-disabled lifecycle write-back, Won/partial deal persistence. Latest measured 1,000-record reconcile: 58,952 ms across bounded invocations, below the 30-minute window; repeat writes zero mirror changes.
- [x] Development Playwright regression: 19 existing tests pass; the added HubSpot scenario passes after correcting the test's expected lowercase health label. It covers real local invitation/session, malformed and valid mapping/audit round-trip, independent CRM/manual divergence and deep link, provider-failure health, keyboard focus, five concurrent signed deliveries with one queue row, tamper rejection and axe checks. Rendered HubSpot pages reviewed at 390, 1280 and 1920 px; no clipping/overflow or navigation redesign.
- [x] Production build and four production Playwright tests pass, including gallery protection, auth, queue performance and prior data-heavy pages. Latest measured ingest p95 20.5 ms; 50k lead page 381-473 ms; Today with 90-day history 591-647 ms. These are local measurements, not deployed SLAs.
- [x] Repository secret scan, process-key browser artifact scan (including HubSpot), formatting, npm audit (zero vulnerabilities) and diff scope review pass. No application dependency/package-lock changes.
- [x] Migration 0021 corrects provider run labels through the existing claim function; SQL verifies HubSpot namespace and that deal-audit entries do not inflate activity-funnel counts. Local migration/schema/RLS suite and generated types pass.

Harness corrections were test-only: an async queue mock now matches the service return type; company association uses a new inquiry fixture because Phase 6 correctly rejects mutation of historical company linkage; fixture cleanup uses the existing local PostgreSQL harness because privileged HTTP DELETE of retained run history is intentionally revoked. No security rule was relaxed to make tests pass.

### Closure evidence

Skills actually used: Ponytail (minimal implementation and existing infrastructure reuse); UI UX Pro Max (existing-UI review checklist). Installed Next.js guidance and official HubSpot API documentation were consulted. Tools used: Git, PowerShell/Python, Supabase CLI, Docker/PostgreSQL, Vitest, Playwright/axe, rendered screenshots, ESLint/TypeScript/Prettier, production build and secret/dependency scans. No Superpowers or installed Supabase/security skill is claimed.

Technical acceptance passes locally for new contact/company write-back, source stage history, reconcile idempotency, named unmapped warnings, attributed Won deals, outage-safe UI and secret protection. Raw provider fixtures are synthetic. External activation and real-use acceptance below are not claimed PASS. Final local cleanup found zero residual HubSpot test contacts/companies/deals and restored the known synthetic mapping to the unconfigured seed state.

Scope/diff reviewed: Phase 7 dependency plumbing and Phase 8 only; no new Phase 8 table/dependency, no Phase 9 delivery or later feature. No secrets/environment files staged except blank .env.example. Commit on main includes existing uncommitted Phase 7 dependency and Phase 8 implementation/evidence; operator-owned Docs/Prompt archive moves remain unstaged. No push/deployment is performed by this phase closure. GitHub CI for this new revision is not executed; earlier run 34773261638 verifies only the Phase 6 ancestor. Phase 9 engineering is READY under the operational-evidence policy, but is not started; real CRM operation still requires the pending external gates.

### Operational / external gates

- [ ] A1/A2 / INT-8.1-8.3: real properties, minimum granted scopes, portal/pipeline/stage/owner mapping, webhook subscriptions and sanitized real sandbox fixtures. HubSpot credentials/connector absent. Synthetic fixtures do not satisfy real-response evidence.
- [ ] Real lead/contact write-back, CRM stage event, won attribution and protected deployed scheduler/queue cadence. No remote CRM API call, migration, deployment or scheduler activation performed.
- [ ] A3 and one-working-week DoD: sales ownership/Closed Won-Lost SLA and CRM consistency without unexplained correction. PENDING operational UAT, never substituted with fixtures.

Preserve Phase 2 authenticated-browser/host-protection gaps and all Phase 3-7 operational/infrastructure items below. Local engineering evidence is not deployed PASS. Phase 7 was uncommitted at this phase's start and is a required dependency of the Phase 8 commit; operator prompt archive moves remain excluded. No Phase 9/Slack, Meta, AI, n8n, campaign modification or fabricated product data.

## Phase 0 — Project Foundation & Architecture

### Requirements

- [x] FR-0.1 / BE-0.1 — Next.js App Router application scaffold and placeholder route.
- [x] FR-0.2 / BE-0.2 — Zod environment parsing at module load with named failures.
- [x] FR-0.3 — Public/server environment split and `server-only` guard.
- [x] FR-0.4 — `lint`, `typecheck`, `test`, and `build` scripts.
- [x] FR-0.5 / INT-0.1 — GitHub Actions push/pull-request workflow with the required gate sequence.
- [x] FR-0.6 — Required control documents and `.env.example`.
- [x] NFR-0.1 — Node version pinned in `.nvmrc` and `package.json`.
- [x] NFR-0.2 — Dependency baseline recorded in `DECISIONS.md`: 22 direct packages, 561 lockfile entries, 450 packages audited.
- [x] NFR-0.3 / BE-0.5 — Phase 0 migration applied from a clean local database twice; schema lint and type generation passed.
- [x] BE-0.3 — Required layer structure with boundary READMEs.
- [x] BE-0.4 — Vitest node/jsdom and Playwright smoke harnesses.
- [x] BE-0.6 — Repository development protocol derived from PRD section 39.
- [x] FE-0.1 — Tailwind and default shadcn/ui foundation without custom tokens.
- [x] FE-0.2 — Placeholder displays application name, server-derived environment, and build commit.
- [x] JOB-0 — No jobs exist in Phase 0.

### Tests and acceptance evidence

- [x] TEST-0.1 — Unit and negative-build checks confirm a missing required variable fails with its name (`APP_ENV` verified at build).
- [x] TEST-0.2 — Unit test accepts valid required public variables; positive production build validates the complete server contract.
- [x] TEST-0.3 — Playwright Chromium smoke test loads `/` and finds the placeholder.
- [x] TEST-0.4 — `npm ci` and the CI command sequence pass locally. Remote GitHub Actions execution remains externally unverified because no authenticated remote repository is available.
- [x] `npm run dev` reached Ready without warnings in 631 ms; `GET /` returned 200 with the application name and `development` environment.
- [x] `npm run lint` passes with zero warnings.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes: 3 files and 4 tests.
- [x] `npm run build` passes with the placeholder route statically generated.
- [x] `npm run secrets:check` passes and no potential secret is present in repository content.
- [x] Phase 0 migration applies twice through clean local resets; schema query confirms `pgcrypto`, `citext`, `public.set_updated_at()`, and zero public tables.
- [x] Full initial diff and architecture-boundary review completed.

## Next phase

Phase 8 only is authorized; see its readiness notes above. MVP Core engineering passed at `ae7836d69649b1910d25747c5832ec1c67ca4a62` (GitHub CI 34773261638 verified successful; 50 baseline unit tests rerun). Preserve all earlier operational and infrastructure evidence below. No Phase 9 implementation is authorized.

## Phase 7 — Integration & Background Job Foundation

**Status: PASS — LOCAL ENGINEERING COMPLETE, as reported at Phase 7 closure. Infrastructure / operational activation: PENDING.** Real source registration and high-frequency deployed scheduler activation remain separate infrastructure/operational evidence under the operator's Phase 7 clarification. No Vercel Pro assumption, paid dependency or n8n.

### Decisions and plan

- [x] Read active Phase 7 and referenced API/error/schema/RLS/integration/retry/attribution/health/security/testing/environment sections; review control documents and Phase 6 CI.
- [x] D-013 records pooling-safe per-job acquisition/lease, event fencing, null machine actors, canonical rejected/failed/dead_letter terminology, attempt semantics, A10 reference, scheduler limits and source selection.
- [x] Apps Script landing-page backend is the first signing source; WhatsApp is not the first activation. Operator explicitly treats native ten-minute Vercel Cron as unavailable until verified and allows later infrastructure activation. Keep `vercel.json` Hobby-compatible with no active cron; registry and opt-in GitHub fallback define the target cadence.
- [x] Implementation sequence: local schema → HMAC/contract → shared lead service + event atomicity → retry/job runner → UI/health → signing/fallback documentation → security, SQL, browser and regression gates.

### Engineering traceability

| Requirements                                                      | Implementation/evidence                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-7.1–7.3, FR-7.7; BE-7.2/7.4; TEST-7.1–7.3/7.6/7.13; NFR-7.3    | Zod nested §23.2 schema; raw-byte HMAC with timestamp/method/path; constant-time dual-key comparison; inclusive ±300s; bounded JSON/UTF-8 body. Failed auth/media/size audits never contain the payload.                                                                                             |
| FR-7.4–7.6; BE-7.1/7.3/7.5; NFR-7.1/7.2; TEST-7.4/7.5/7.12        | Unique idempotency key and request digest; durable 202 receipt; `after` processing; stored receipt/current outcome on replay; same Phase 6 preparation/domain/commit service; source_event_id and correlation/attempt logs. Ten concurrent deliveries create one inquiry.                            |
| FR-7.8/7.9; BE-7.8; JOB-7.1; TEST-7.9–7.11                        | SKIP LOCKED claims, fencing, expired worker recovery; application retry classification; full-jitter 1m/5m/25m/2h/6h caps; five total attempts by default; rejected terminal events; dead-letter exhaustion/manual retry; candidates for future Phase 9 alerts.                                       |
| FR-7.10–7.12; BE-7.6/7.7; JOB-7.2; NFR-7.4/7.5; TEST-7.7/7.8/7.11 | One registered retry job; transaction advisory acquisition plus run lease; wrong bearer/GET session/cross-origin rejection; same-origin authorized manual POST; 40s budget/24s item reserve and bounded batch; resumable due queue; dual-run tests; optional fallback and documented native binding. |
| FR-7.13/7.14; BE-7.9; FE-7.1/7.2                                  | Shared cards/table/drawer, URL-filtered 20-row server pagination, run counts/timing/correlation/redacted error, rejection metadata, dead-letter retry, manual run, Today job-health strip. No payload/secret is serialized into UI.                                                                  |
| INT-7.1                                                           | Apps Script reference signing recipe in INTEGRATIONS.md; Script Properties/server-only credentials, stable submission UUID, safe receipt and transport retry semantics.                                                                                                                              |
| INT-7.2; deployed cadence acceptance                              | PENDING external registration/activation; no real source secret or schedule is configured or claimed by local fixtures.                                                                                                                                                                              |

### Engineering evidence

- [x] Local forward migrations 0016–0018 applied; generated database types updated. 0017 adds the signed-request replay fence; 0018 removes Supabase's default service-role DELETE grant from retained plumbing history. No remote migration/reset.
- [x] Unit/service tests: 61 pass; Phase 6 qualification/normalization/formula branch coverage remains 159/159. HMAC boundary/rotation/tamper, terminal/retryable errors, batch/time budget, double-run, auth/CSRF and scrubbed failures covered.
- [x] Isolated Phase 7 browser test passes: ten concurrent signed deliveries → one MQL, replay, forced real transaction failure → five attempts → dead letter → UI retry → success; rejected payloads are visible without PII. Browser session fetch preserves Secure cookies; no auth weakening.
- [x] Actual rendered integrations reviewed at 390/1280/1920px; keyboard drawer Escape restores focus; axe zero A/AA violations on integrations and Today. Shared DataTable confines horizontal scrolling; retry toast remains visible after the row leaves the list.
- [x] Production build and browser secret scan pass, including all three process-only generated Phase 7 secrets. Four production-browser tests pass. Warm signed-ingest p95 is 27.2ms (20 measured requests, local production server/Supabase), versus ≤500ms. Phase 6 50k first-page samples 412/393/439ms; Today 90-day samples 618/588/257ms.
- [x] npm audit: zero vulnerabilities. Final formatting, lint, strict typecheck, 61 unit tests and repository secret scan pass.
- [x] Whole-app Playwright: 19/19 pass, zero failures/flaky/skipped (177.0 seconds), including the Phase 6 5,000-row CSV import/replay. Sequential SQL suite passes across Phases 2?7; ten concurrent job acquisitions yield one winner/nine refusals. Schema lint has no errors; database types regenerated.
- [x] Production build, four production browser gates and exact configured-secret client scan pass. Full tracked/new-file review and diff whitespace check completed; no dependencies or future-phase connectors added. Final presentation correction formats Today last-success using the existing WIB helper.
- [x] Git remains on main at ae7836d69649b1910d25747c5832ec1c67ca4a62; the verified CI run 34773261638 covers the Phase 6 baseline only. Phase 7 local changes are not committed/pushed/deployed; remote CI for this revision is not claimed. Operator-owned prompt archive moves remain untouched.
- Harness notes: Windows sandbox blocked CLI/worker subprocesses; approved unrestricted reruns succeeded. An incompatible PowerShell random-key helper left CRON_SECRET empty; the build correctly rejected it, and Node crypto process-only values passed. A concurrent SQL run overlapped browser fixtures and was invalid evidence; final database tests must run sequentially. A new HTTP timeout initially affected CSV commits; it is now scoped to machine ingest only and the full Phase 6 import regression now passes. Type generation emitted the previously observed non-fatal CLI MaxListenersExceededWarning and completed successfully.

### Acceptance and closure

- [x] Signed payload creates a lead through the shared service; unsigned/tampered payload is rejected without a logged body.
- [x] Ten concurrent deliveries produce one lead; changing the unsigned idempotency header does not bypass the signed-request replay fence.
- [x] Forced failure follows retry classification/backoff, exhausts at five attempts, and can recover through the authorized manual control.
- [x] Integrations shows runs, rejected requests, dead letters and job controls; Today shows actual health/configuration state.
- [x] Required local engineering commands, SQL/RLS/security, accessibility, responsive and performance gates pass.
- [ ] Deployed ten-minute cadence remains unverified, explicitly deferred by the operator's no-paid-plan/local-foundation clarification. The opt-in fallback is implemented but inactive.
- [ ] Real Apps Script submission, visible deliberate rejection and automatic deployed retry recovery remain operational evidence; local fixtures do not satisfy them.

This is a local engineering PASS under the operator's Phase 7 scope clarification, not a claim that every original deployed acceptance item or real-use Definition of Done occurred. Source registration (INT-7.2) and deployed cadence (FR-7.12/JOB-7.2 acceptance) must be completed before integrated operation. This historical Phase 7 record predates Phase 8; see current status above.

### Infrastructure / operational validation (not fabricated)

- [ ] Register the actual Apps Script source and its server-side signing secret; demonstrate a real landing-page inquiry, rejected request visibility, and automatic recovery in deployed use.
- [ ] Verify host protection, actual Vercel plan and an approved scheduler; configure runtime/repository secrets through normal protected tooling and record deployed cadence. Native ten-minute Cron is not assumed available. GitHub schedule is opt-in/best-effort and not a guaranteed cadence SLA.
- [ ] Apply reviewed Phase 3–7 migrations remotely only under the authorized protected deployment workflow. No deployment, remote database mutation, secret registration or paid upgrade occurs during local foundation work.

All earlier operational backlog items remain pending. No Phase 8/HubSpot, Meta, Slack, alerts, AI, n8n, automated campaign changes or fake product records are introduced.

## Phase 6 — Lead & Funnel Core

**Status: PASS — ENGINEERING COMPLETE (local and GitHub CI gates verified 2026-09-14). Operational UAT: PENDING.** Implementation `3675e32c2f3914cadced152fbfcc6812d29f6d11` is pushed to `main` and passed [GitHub CI 34772945562](https://github.com/Dyrnzefanya/GrowthCockpit/actions/runs/34772945562). Baseline `1a32371b1c762557a94a54aed7812dd432e6bea6` passed [GitHub CI 34734963692](https://github.com/Dyrnzefanya/GrowthCockpit/actions/runs/34734963692); the baseline unit suite was rerun (33 tests). Contact = person. Lead = inquiry event. One contact may have multiple leads.

### Resolved operator decisions and implementation plan

- [x] Operator D-009: matching normalized person/product uses a rolling 24-hour window, inclusive at exactly 24 hours. Different products remain separate. More than 24 hours after the last matching observation creates a new inquiry. No calendar bucket.
- [x] Operator D-010: retain missing/invalid email and phone with `contact_id=null` and `DQ_NO_CONTACT`; never create a placeholder person or merge missing identities. Repository decision IDs D-009/D-010 were occupied, so both operator decisions are recorded together in D-011.
- [x] Plan executed: decisions/persistence → forward migrations → pure domain/tests → authorized atomic repositories/services → registry/manual/detail/CSV/funnel/Today → database/browser/performance/security review. D-012 records dependency and transaction choices before their introduction.
- [x] Migrations 0010–0011 implement the two PRD migration responsibilities. Forward corrections 0012–0015 preserve applied migration immutability: batch persistence, bounded RPC JIT settings and single snapshot aggregation. No Phase 7 schema is created.

### Engineering gates — requirement traceability

| Requirements                                        | Implementation and evidence                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-6.1–6.3, BE-6.1/6.5/6.6, FE-6.2                  | Five CRM tables; Zod manual input; email-then-phone and domain-then-name resolution; unknown attribution retained; anonymous inquiry retained per operator clarification. Domain and browser tests.                                                                                                                     |
| FR-6.4–6.5, TEST-6.3–6.5                            | Deterministic contact/product/UTC-anchor dedupe key plus rolling observations; separate request/CSV replay hashes; normalized identity conflicts fail safely. Exactly 24h duplicate, >24h repeat, different products, anonymous rows and first-touch preservation tested.                                               |
| FR-6.6–6.7, BE-6.3, NFR-6.2, TEST-6.1               | Pure q1 with ordered DQ_NO_CONTACT/DQ_TEST/DQ_NONCOMMERCIAL/DQ_COMPETITOR/DQ_OUT_OF_SCOPE; MQL requires Q_CONTACTABLE/Q_BUSINESS/Q_INTENT/Q_SIZE. Settings-backed lists/quantity threshold; existing verdict snapshots are immutable. Browser saves/restores threshold and confirms only a new inquiry changes verdict. |
| FR-6.8–6.9, FE-6.4, TEST-6.6                        | Mandatory-reason override, source=manual, actor/time/history; compare-and-swap rejects stale edits; append-only SQL trigger. No automatic requalification.                                                                                                                                                              |
| FR-6.10–6.11, BE-6.7, FE-6.5, TEST-6.9              | UTF-8 CSV upload → column mapping → dry-run created/updated/skipped/errors → atomic commit → report. 5 MB/5,000-row bounds; server revalidation/fingerprint; no stored CSV. Reimport is unchanged.                                                                                                                      |
| FR-6.12–6.13, FE-6.1/6.3                            | 20-row server pagination; URL status/channel/platform/campaign/WIB dates/attribution/owner filters; detail shows contact/company/requirement, first/last touch, flags, audit timeline and linked deal.                                                                                                                  |
| FR-6.14, BE-6.8                                     | Manual deal create/edit and lead linkage in one revision-checked transaction; numeric(18,2), currency, stage and close dates, attribution evidence. No HubSpot writes.                                                                                                                                                  |
| FR-6.15–6.16, BE-6.2/6.4, FE-6.6, TEST-6.7/6.8/6.10 | Cohort/activity fact views, maturity disclosure, campaign quality, coverage and centralized §24.1 formulas. Unknown denominators/mixed currency return unavailable. CPL/CPQL/CPSQL/CAC/ROAS show — until spend exists.                                                                                                  |
| FE-6.7                                              | Today uses real new inquiries, missing attribution and MQL/SQL workday SLA reasons; bounded visible queue and registry link. No scheduler.                                                                                                                                                                              |
| NFR-6.1/6.3, TEST-6.11                              | Real browser create → qualify → repeat/dedupe → override → deal → funnel; 5,000-row import/replay; 50,000-row production page measurement; responsive/axe checks.                                                                                                                                                       |

### Engineering evidence

- [x] Clean local reset applies migrations 0001–0015. Schema lint passes; generated database types regenerated.
- [x] SQL RLS/permissions: anonymous CRM/view access denied; authenticated writes and privileged RPC execution denied; first/last-touch and stage history protected. Invalid final stage insertion rolls back the whole batch. Five concurrent snapshot writers produce one commit and four stale-write rejections.
- [x] Hand-calculated fixture: four inquiries, three MQL including one SQL, two deals (one won/one lost), three attributed leads, IDR 1,000,000 won revenue. MQL rate 75%; SQL/MQL 1/3; win rate 50%; coverage 75%. SQL transition on September 10 18:00 UTC belongs to September 11 WIB activity, while its outcome remains in the September 1 acquisition cohort.
- [x] Unit/service suite: 50 tests pass. Coverage gate measures 159/159 branches across q1, attribution normalization, lead rules and metric/funnel calculations. Server-paged campaign/activity output retains whole-cohort totals; later timeline pages remain accessible.
- [x] Final local browser import of 5,000 mapped inquiry-export rows and replay passed; measured commit 8.489 seconds (prior runs 13.7–16.6 seconds), all below 60 seconds. The UI exposes pending progress and per-row results. Server filters/page-two navigation and unchanged reimport pass. Fixtures are isolated locally and removed.
- [x] Final production-mode browser: all three gates pass. At 50,000 leads, first-page samples are 357/320/356 ms (≤800 ms). Today 90-day history samples are 230/308/593 ms (≤1,500 ms). Gallery exclusion, shell and logout regression pass.
- [x] Production build, lint, strict TypeScript, npm audit (zero vulnerabilities) passed. One build attempt during local database reset lacked CLI-derived test environment values and correctly failed environment validation; rerunning with the recovered local contract passed. No validation was weakened.
- [x] Final whole-app Playwright: 18/18 pass, including local invite-only auth/logout/two-tab regression, Phase 3–5 flows, Phase 6 persistence, 20-row timeline navigation, settings audit/history preservation, and shell interactions. axe reports zero WCAG A/AA violations on representative routes.
- [x] Actual rendered lead registry/new/import/detail, funnel and Today reviewed at 390/1280/1920 px. Native keyboard controls and override dialog focus work; document overflow checks pass. Tables scroll within their own region. Fixed misleading new/import breadcrumbs. Funnel/activity and timeline paginate on the server; totals cover the entire filter scope.
- [x] Formatting, lint, strict typecheck, production build, repository secret scan and actual-key browser bundle scan pass. Final diff review preserves the approved shell, authenticated authorization boundaries and Phase 6-only scope. No Phase 7 integration, automatic ingest, job, alert, decision engine or fake product data is introduced.
- [x] Exact-revision GitHub CI — implementation `3675e32c2f3914cadced152fbfcc6812d29f6d11`, run `34772945562`, completed successfully on 2026-09-14 WIB. Installation, local migrations/schema/RLS, generated-type consistency, formatting, secret scans, lint, typecheck, unit/branch coverage, build, whole-app browser and production browser gates all passed. Operator-owned prompt-file moves remain excluded from the commit.
- Diff review notes three trailing-blank-line warnings in already-applied migrations 0010, 0011 and 0015. They are cosmetic and are retained to honor migration immutability; no schema or behavior issue remains.

Installed Ponytail and UI UX Pro Max instructions were used to keep native forms, shared table/shell components and operational hierarchy. UI UX Pro Max's search script is absent; no generated design-system result is claimed. No installed Superpowers/PostgreSQL/Supabase/domain-modeling skill was found. Actual tools: Next.js installed docs, Supabase CLI/PostgreSQL/Docker, Vitest/V8 coverage, Playwright/axe, Git/gh, and official CSV/RLS documentation.

### Technical acceptance criteria

All nine PRD technical acceptance criteria pass with the evidence above: manual qualification with reasons; duplicate prevention/repeat inquiry; mapped inquiry CSV export and unchanged reimport; hand-calculated funnel; visible cohort/maturity; unavailable spend metrics; complete paginated actor/source timeline; no anon lead access; required lint/typecheck/unit/build commands. MVP Core engineering is complete. Real operator adoption and the unresolved Phase 2 deployed checks remain pending.

### Operational / UAT gate

- [ ] Operator enters/imports real leads and answers “how many MQLs did we get last week, and from where?” within the application. Synthetic SQL/browser fixtures are not this evidence. Under the operator's standing closure policy, this is an operational adoption gate, not an engineering failure.
- Remote Phase 3–6 migrations are not applied in this turn; no manual remote deployment or integration configuration occurs. Git publication can trigger the repository's existing deployment automation and must not be represented as remote database verification.

## Operational Validation Backlog

Phase 9: A4 / INT-9.1 Slack workspace app, distinct production/development channels and webhooks, protected deployed scheduler cadence, one real MQL delivery and one week without duplicate notifications or missed critical conditions remain **PENDING**. Local fixtures prove behavior but are not operational evidence.

Phase 8: A1-A3, INT-8.1-8.3, real sandbox captures, deployed CRM transitions/write-back and cadence, followed by one working week of consistency evidence, remain **PENDING**. D-014 is resolved. No Phase 2-7 item below is closed by this addition.

These items require deployed browser access, real operator use, real business data, or elapsed operational time. They remain open and are not replaced by fixtures or automated evidence. Pending items do not block sequential engineering work unless the PRD explicitly makes one a hard dependency; they must be revisited during real-world use and final production hardening.

- [ ] Phase 2 — verify authenticated deployed session persistence.
- [ ] Phase 2 — verify deployed logout and two-tab/session invalidation behavior.
- [ ] Phase 2 — complete an authenticated deployed settings read/update/reload/restore round-trip and verify its audit behavior.
- [ ] Phase 2 — inspect authenticated deployed browser assets against the actual privileged values without exposing them.
- [ ] Phase 2 — verify Vercel Deployment Protection for the intended production deployment.
- [ ] Phase 3 — use the daily checklist through at least one real working day without database intervention.
- [ ] Phase 4 — replace at least one procedure previously kept in chat or a spreadsheet with a published Playbook article.
- [ ] Phase 5 — record and complete one real operator experiment after the system enters operational use.
- [ ] Phase 6 — enter/import real inquiries and use the funnel to answer last week's MQL count and sources without leaving the app.

## Phase 5 — Experiment OS closure

**Status: PASS — ENGINEERING COMPLETE. Operational UAT: PENDING.** On 2026-09-13 the operator classified the one-real-experiment requirement as operational evidence rather than an engineering defect. Every Phase 5 implementation requirement and technical acceptance criterion passes. Baseline revision `df54c4f5fdef20b2c0b7afe6932a1a3d221fa89a` passed GitHub CI run 34732876878. Before Phase 5 changes, local formatting, lint, strict typecheck, 26 unit/component/service tests, schema lint, and identity/workflow/playbook SQL tests passed. Existing operator-owned prompt-file moves remain excluded from Phase 5 scope.

1. [x] BE-5.1 / FR-5.2: forward migration 0009 adds experiments/results, constraints, indexes, authenticated RLS, audit ownership, race-safe yearly codes, and atomic lifecycle/result persistence.
2. [x] BE-5.2 / TEST-5.1, 5.3–5.5: pure transition, priority, duration, sample, and elapsed/review rules have exhaustive deterministic tests.
3. [x] BE-5.3 / FR-5.1–5.11: Zod boundaries, authenticated repositories, services, conflict handling, URL filters, external references, and indexed learning search are complete.
4. [x] FE-5.1–5.6: backlog/running/completed/cancelled views, one-screen form, detail/result panel, completion dialog, learning library, and Today review queue are active.
5. [x] TEST-5.2 / TEST-5.6: concurrent code uniqueness and browser create → run → review queue → complete → retrieve pass, including accessibility and responsive review.

Decision D-010 resolves the PRD's missing priority equation as `(priority × confidence) / effort`, with each input 1–5; the exact formula is displayed to operators. No new dependency is planned.

### Engineering gates — requirements and acceptance

- [x] FR-5.1 / NFR-5.1: creation uses one responsive screen with six required fields—title, hypothesis, variable, primary KPI, start date, and review date—and optional control, variant, secondary KPI, values, priority inputs, platform, and references.
- [x] FR-5.2: codes use the start-date year and three-digit sequence. A real 20-client local concurrency test produced 20 unique monotonic codes from `EXP-2027-001` through `EXP-2027-020`.
- [x] FR-5.3 / TEST-5.1: the exhaustive 4×4 domain matrix implements `draft → running`, `running → completed`, and `draft|running|completed → cancelled`; cancelled is terminal. Invalid errors name the allowed set. Transactional SQL independently enforces persisted transitions and stale-revision rejection.
- [x] FR-5.4 / TEST-5.3: Zod, server service, atomic RPC, table checks, HTML validation, SQL, and browser tests prevent completion without outcome, KPI result, conclusion, learning, and next action.
- [x] FR-5.5–5.6 / TEST-5.5: defaults are 3 days and 10 observed results from typed `app_settings`. Short duration warns without blocking. Small samples warn and persist `sample_warning=true` plus `verdict_label=inconclusive_by_default`; the result and library display that limitation.
- [x] FR-5.7–5.8 / TEST-5.4: backlog order and visible score use `(priority × confidence) / effort`; ties use creation time and code. Running rows show elapsed and remaining/overdue review days.
- [x] FR-5.9: the completed learning library searches indexed conclusion/learning text and filters by variable, KPI, and outcome through URL parameters with 20-row server pagination.
- [x] FR-5.10: Today queries `running AND review_date <= today` against the status/review index and displays real due records only.
- [x] FR-5.11: strict application and database shapes accept optional campaign/ad set/ad identifiers and HTTP(S) landing-page URLs; unknown fields and unsafe URLs fail.
- [x] FE-5.1–5.6: the interface guides Hypothesis → Test → Evidence → Decision → Learning, retains the approved shell, and uses honest empty states without fabricated performance data.
- [x] All six Phase 5 acceptance criteria pass with local automated evidence, including the complete persisted lifecycle, mandatory learning, review-date queue, displayed backlog formula/order, both warnings, and the four required project commands.

### Engineering gates — verification

- [x] Clean rebuild applies migrations 0001–0009; generated TypeScript database types are stable. Schema lint reports no warnings.
- [x] Transactional SQL verifies lifecycle, result atomicity, learning search/index, cancellation from draft/running/completed, terminal cancelled state, ownership audit, malformed references, no anonymous grants/RPC execution, no direct authenticated writes, and required indexes. Fixtures roll back.
- [x] Unit/component/service suite: 11 files and 33 tests pass, including all 16 state pairs, priority ordering/ties, year/date timing, guardrails, strict external-reference input, and mandatory completion fields.
- [x] Authenticated Playwright: all 16 development tests pass in 2.1 minutes with one worker. Phase 5 creates a real persisted local fixture, surfaces the due review on Today, blocks empty learning, stores sample evidence, retrieves full-text learning, exercises URL filters, and deletes its records and identity.
- [x] Actual rendered UI inspected at 390, 1280, and 1920 px. The one-page form, lifecycle tabs, empty/completed list, Today queue, and learning filters show no clipping or document overflow. Keyboard-native controls work; axe reports zero WCAG A/AA violations on experiments list/new/detail/learnings and Today.
- [x] Formatting, ESLint, strict TypeScript/Next route generation, production build, repository secret scan, client-bundle secret scan, npm audit (zero vulnerabilities), production gallery exclusion, and both production Playwright tests pass. The final Today 90-day local loads were 228, 291, and 394 ms, all below its existing budget.
- [x] Full diff review found no Phase 6 tables/routes/business logic, integration calls, jobs, AI, statistical-significance engine, multivariate engine, automatic platform metrics, or campaign mutation. No dependency was added. Remote database and deployment remain unchanged.
- [x] Phase 5 engineering closure: implementation, technical acceptance, migrations/schema, RLS/security, automated tests, accessibility/performance, build, documentation, and scope review are complete.

### Operational / UAT gate

- [ ] PRD §35 operational UAT: at least one real operator experiment is recorded and completed in the app after the system enters actual operational use. Synthetic local SQL/browser fixtures are explicitly not claimed as this evidence.

## Phase 4 — implementation plan

**Status: PASS — ENGINEERING COMPLETE. Operational Adoption/UAT: PENDING.** On 2026-09-13 the operator classified the procedure-replacement requirement as operational adoption evidence rather than an engineering defect. All Phase 4 implementation requirements, technical acceptance criteria, migrations, security checks, automated tests and documentation evidence pass. The adoption item remains open and is not falsely claimed.

- [x] FR-4.1–4.8 / BE-4.1–4.2: one-table playbook migration, weighted full-text index/RPC, authenticated RLS/audit, slug/status domain rules, repository and service CRUD/search.
- [x] FE-4.1–4.3: operational library, URL search/filters, safe reader/TOC, Markdown editor/preview, archive/delete and deep links.
- [x] TEST-4.1–4.5 / NFR-4.1–4.2: collision, ranked body search, filters/status, hostile Markdown, RLS, 500-article query budget, browser CRUD/search/read/archive/accessibility/responsive evidence.
- [x] Phase 4 engineering closure: gates, traceability, documentation and scope review complete.

### Phase 4 engineering evidence

- [x] Migrations 0001–0008 rebuild locally from empty. The Phase 4 migration creates one RLS-protected article table, weighted generated `tsvector`, GIN/filter indexes, audit trigger and authenticated search RPC. The seed migration publishes exactly five substantive articles: **SOP peluncuran kampanye** (SOP), **Checklist QA pelacakan** (checklist), **Checklist review mingguan** (checklist), **Pohon diagnosis ketika CPL meningkat** (decision tree), and **Referensi UTM dan penamaan kampanye** (reference).
- [x] Transactional SQL tests prove five readable seeds, body-only retrieval, title-over-body ranking, default archive exclusion, explicit archive retrieval, duplicate rejection, audit actor protection, no anon table/RPC access, the GIN index, and search below 500 ms with 500 rolled-back fixtures.
- [x] Domain/component tests prove title slugging and `-2` suffixes, publish version/timestamp behavior, tag normalisation, table-of-contents extraction outside code blocks, PostgreSQL timestamp revision parsing, GFM output, and removal of script/image/JavaScript URL injection.
- [x] Browser E2E creates a draft, survives an aborted save with the full editor buffer, reads safe Markdown and TOC, publishes/version-checks, finds a body-only term, filters by type, resolves a collision to `-2`, archives, excludes the archive by default, and reaches it by explicit filter/deep link. Fixtures use only loopback Supabase and are removed.
- [x] Actual rendered `/playbook` layouts at 1280, 1920 and 390 px were inspected. Search remains visible, filters stack on mobile, cards stay scan-friendly, keyboard focus works, no horizontal overflow occurs, and axe reports no WCAG A/AA violations on list, reader and editor routes.
- [x] Full quality gates pass: formatting; ESLint; strict TypeScript/Next route generation; 26 unit/component/service tests in 9 files; clean local migration rebuild; schema lint; transactional identity/workflow/playbook SQL tests; production build; repository and client-bundle secret scans; npm audit with zero vulnerabilities; all 15 development Playwright cases; and both production Playwright cases. The targeted Phase 4 browser test passed again after its final type/category/tag, empty-result and delete assertions.
- [x] Generated database types include migrations 0007–0008 and reproduce byte-for-byte. Supabase CLI emitted its existing non-blocking MaxListeners warning while exiting successfully.
- [x] Scope review: no Phase 5 table, route behavior, experiment feature, external integration, scheduler, AI, collaboration, attachment or revision history. Product routes contain only the five real procedural seeds; browser/SQL synthetic records are local, guarded, rolled back or deleted.
- [ ] PRD §35 Phase 4 Definition of Done: operator replaces at least one procedure previously kept in chat or a spreadsheet with a published article. Automated seed/test content is not claimed as this operator evidence.

No remote database migration or deployment was performed for Phase 4, matching the local-first phase workflow. The pending adoption evidence did not block Phase 5: PRD §35 Phase 5 lists dependencies on Phases 1 and 2, plus Phase 3 only for its Today section. Phase 5 began only after the operator's explicit instruction on 2026-09-13.

## Phase 2 handoff / Phase 3 authorization

The operator confirms the Phase 2 implementation, deployment, remote database/RLS verification, production login, migrations, security gates and GitHub CI are successful. Commit `b942f21e3032e8b240b976799295888a8b3357d4` passed [CI 34689617155](https://github.com/Dyrnzefanya/GrowthCockpit/actions/runs/34689617155). The last attempted native Windows browser inspection was stopped by Computer Use because it could not confidently determine the browser URL. This is an external verification limitation, not a known application defect. The operator explicitly authorizes Phase 3 with the following checks retained as NOT VERIFIED:

- [ ] Authenticated deployed session persistence.
- [ ] Deployed logout / two-tab browser behavior.
- [ ] Authenticated deployed settings round-trip.
- [ ] Authenticated deployed browser-asset inspection.
- [ ] Vercel Deployment Protection verification.

Historical Phase 2 closure-attempt entries below remain evidence of those attempts; their statements prohibiting Phase 3 are superseded only by this explicit handoff. Auth/security architecture remains binding.

## Phase 3 - Today / Daily Workflow OS

**Status: PASS — ENGINEERING COMPLETE. Operational UAT: PENDING.** The operator clarified on 2026-09-13 (Asia/Jakarta) that one-real-workday checklist use is operational UAT rather than an engineering implementation gate. PRD §39.4 does not include that observation period in its phase-gate checklist, and Phase 4 declares dependencies only on Phases 1 and 2. No real-workday operator use is claimed. The five Phase 2 residual checks above remain NOT VERIFIED. Phase 4 is ready but unstarted.

### Implementation and traceability

| Requirements                             | Implemented evidence                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-3.1 / BE-3.1                          | Forward migrations `0005_workflows` and `0006_workflow_seeds`; Daily Ops weekdays (pacing, inquiries, stale MQL, source health, one observation), Weekly Review Monday (review, learning, focus), Monthly Review first weekday (routine review, procedure review, focus). Manual checks only; no integrations or fabricated performance data.                      |
| FR-3.2 / TEST-3.1                        | Lazy atomic materialization with unique template/date and run/step constraints; five concurrent reads plus five reloads produce exactly one run and two snapshotted items. No historical backfill.                                                                                                                                                                 |
| FR-3.3-3.5 / BE-3.3 / NFR-3.1 / TEST-3.4 | `updateWorkflowItem` handles the required toggleItem/setItemNote behaviors through one validated write path; domain `recomputeRunStatus` derives status. Completion timestamps set/clear; optional-step semantics in D-008. Compare-and-swap retries fresh state and atomically updates item/run. Optimistic rollback and visible retry tested by aborting a save. |
| FR-3.6-3.8 / TEST-3.2 / TEST-3.5         | Template create/edit, keyboard reorder, future-step removal and template deactivation; snapshots preserve old label/help/required/order/name/version. Deactivated schedules produce no future run; existing runs remain visible.                                                                                                                                   |
| FR-3.9 / BE-3.4                          | Dated quick notes, idempotent save retry, date filter and pagination. Draft retained on failure; controls disabled during pending saves to avoid losing edits. Privacy guidance excludes credentials and customer PII.                                                                                                                                             |
| FR-3.10 / FE-3.4                         | Last 30 WIB dates, completion percentages, server pagination, sorting and run drill-down at `/workflows`.                                                                                                                                                                                                                                                          |
| FR-3.11 / BE-3.2 / TEST-3.3              | Four date helpers plus ISO week and date arithmetic; 23:50 WIB, midnight, full week, leap February, December and ISO year boundaries. Also passed with UTC and America/Los_Angeles process timezones.                                                                                                                                                              |
| FE-3.1-3.3 / FE-3.5 / TEST-3.6           | Today greeting/date/week, shared checklist and notes components, template editor; existing shell/date range/navigation unchanged. Completed state and notes survive reload and a separate Chromium browser with a separate approved workspace user.                                                                                                                |
| NFR-3.2                                  | Local production with 90 historical runs/items: three warm reload-to-visible-checklist samples of 331, 361 and 664 ms, all under 1500 ms. First visit also renders newly materialized checklist. Unthrottled local evidence, not a deployed latency claim.                                                                                                         |
| INT / JOB                                | Not applicable. No scheduler, external integration, job or Phase 4+ feature.                                                                                                                                                                                                                                                                                       |

### Technical evidence

- [x] Local database rebuilt from empty with migrations 0001-0006; schema lint reports no errors. Existing applied migrations 0001-0004 were not edited. No remote reset or schema change.
- [x] Identity plus workflow SQL tests pass transactionally and roll back: provisioning, profile isolation, role/audit restrictions, note authorship, RLS, no anon table/RPC access, no normal delete grants, atomic snapshots/materialization and stale-write rejection.
- [x] Generated database types regenerated from the rebuilt schema; a second generation matched byte-for-byte. Supabase CLI emitted a non-blocking MaxListeners warning during generation; command completed successfully.
- [x] Formatting, lint, TypeScript, 22 unit/service tests (8 files), production build, repository secret scan, exact privileged-key browser artifact scan and npm audit (zero vulnerabilities) pass.
- [x] All 14 development Playwright cases pass. After the repository fix, 11 non-auth cases passed in the full run; the auth suite initially raced streamed page metadata before axe, so it now explicitly asserts the title and all 3 auth cases passed on targeted rerun. Coverage includes existing Phase 1/2 regressions, auth/session/settings, axe, keyboard, URL filters, drawer, table and responsive checks. Phase 3 browser test also covers empty day, materialization failure/retry with notes usable, optimistic recovery, saved notes, snapshots, deactivation, five reloads and another browser.
- [x] Production Playwright: 2 tests pass; gallery remains 404, protected logout behavior and local paint budget pass, plus the 90-day Today check above.
- [x] Actual rendered desktop 1280/1920 and mobile 390 screenshots inspected, with live interactions and axe checks. No clipping/overflow in tested layouts. Template reorder works by keyboard; shared shell focus/drawer tests pass. Screenshot tooling uses `caret: initial` so it does not inject attributes before React hydrates; final Phase 3 console check finds no hydration warnings.
- [x] Full changed-file and boundary review: no new dependency, public route handler, auth architecture change, external API, privileged application write or fabricated metric. Test-only fixtures are loopback guarded and cleaned up. New components compose Phase 1 SectionCard, DataTable, StatusBadge, ErrorState, EmptyState and input/button primitives; no design-system replacement or new token scheme.

### Acceptance criteria

- [x] `/today` shows the correct checklist for the current WIB weekday - seeded schedules and full-week domain tests; actual no-checklist Sunday verified before creating the local test template.
- [x] Five refreshes create exactly one run per template per day - concurrent reads, reloads and direct local row-count checks.
- [x] Completed steps and notes survive reload and a different browser - independent browser/account readback and update.
- [x] Editing a template does not alter a historical run's labels - SQL plus browser snapshot verification.
- [x] `/workflows` shows 30-day history with completion percentages - date-bounded repository query and browser drill-down.
- [x] A day with no applicable template renders an explicit state - actual Sunday browser check plus model test; notes remain usable.
- [x] Four verification commands pass - lint, typecheck, unit tests and build.
- [ ] Operational UAT follow-up: operator runs the daily checklist through the app on at least one real workday without database intervention. Automated fixtures are not this evidence, and this UAT is not marked complete. Per the operator's 2026-09-13 classification, it does not block the completed engineering gate or Phase 4 readiness.

### Review findings resolved

The production regression initially found newly created runs missing on their first render: same-render GET memoization reused the earlier empty query. D-008 records the targeted repository fix using independent AbortController signals for reads involved in materialization/retry. The first-visit production test now passes without a preparatory reload. Other earlier failures were test timing/locator issues; they were corrected and rerun, not waived.

### Delivery and remaining work

Phase 3 requirements are `Verified` in the PRD traceability matrix; the Master requirements and future-phase text are unchanged. D-008 records migration numbering, snapshot/consistency decisions and the native date-helper substitution. AGENTS, ARCHITECTURE and DATA_MODEL reflect the authorized Phase 3 slice.

Phase 3 implementation commit `02fa410fa9d27098096e3950ec026092fb824c32` was pushed to `main`. [GitHub CI run 34718679621](https://github.com/Dyrnzefanya/GrowthCockpit/actions/runs/34718679621) passed all steps in 3m37s: clean install, isolated Supabase, schema lint, transactional database tests, generated-type drift, formatting, repository secret scan, lint, typecheck, unit tests, production build, client-bundle secret scan, Chromium installation, development Playwright and production Playwright. The run emitted one non-blocking GitHub annotation that v4 actions target the deprecated Node 20 action runtime while the runner forces Node 24; no gate failed. This push does not claim a remote database migration, deployed Phase 3 verification, host-protection verification, or operational UAT. Preserve the real-workday UAT as follow-up evidence and do not relabel the five Phase 2 residual checks as passed. Phase 4 may begin only after explicit operator instruction.

Skills/tools actually used: Ponytail for minimal implementation; UI UX Pro Max guidance for accessible operational controls (its installed search script is unavailable, so no design-search result is claimed); installed Next.js documentation and official fetch guidance for memoization; Supabase CLI/PostgreSQL/Docker, Vitest, Playwright/axe, TypeScript/ESLint/Prettier, Git and repository security scripts for implementation and verification. No Superpowers skill was available or invoked.

## Phase 1 — UI/UX Foundation & Application Shell

Status: **PASS — final refined state approved on 2026-09-11 (Asia/Jakarta).** All technical gates and the final operator acceptance gate are satisfied. The approval below closes the refinement requested after `df631bc`.

- [x] Phase 0 regression: lint, typecheck, four existing unit checks, browser smoke, production build passed before implementation. Its prior migration evidence is unchanged; no database files changed.
- [x] FR-1.1 / FE-1.1 — Color, typography, spacing, radius, elevation, and focus tokens centralized; automated source check enforces token use.
- [x] FR-1.2–1.3 / FE-1.6 — All 31 unique statuses use the same four semantic palettes with icon and text.
- [x] FR-1.4–1.5 / BE-1.2 / FE-1.9 — Single navigation config, sidebar, header, environment badge, breadcrumbs, URL date-range form, container, mobile drawer.
- [x] FR-1.6–1.8 / BE-1.1 / FE-1.10 — All twelve routes implemented in app/auth groups with honest activation states; Today includes every §25.2 section placeholder.
- [x] FR-1.9 / FE-1.8 — Loading (section, metric, table), empty, error/retry, stale, and not-connected patterns demonstrated in the gallery.
- [x] FR-1.10 / FE-1.4 — Injected-data table with sorting, filtering, column visibility, pagination, row actions, truncation/full-text title, internal horizontal scrolling, loading and empty states; server pagination contract above 500 rows.
- [x] FR-1.11 / FE-1.5 — Reload-safe URL filters and dates; malformed dates and reversed ranges ignored; form rejects reversed ranges.
- [x] FR-1.12 / NFR-1.3 — Keyboard focus, skip link, drawer/dialog focus management; axe reports zero violations on Today, Leads, Experiments, and gallery.
- [x] NFR-1.1 — Local production Chromium first contentful paint meets the ≤1.5 s budget. This is unthrottled local evidence, not a network/device performance guarantee.
- [x] NFR-1.2 — Static skeleton pages remain Server Components; client JavaScript is confined to shared shell/interactive components.
- [x] NFR-1.4 / FE-1.11 — Gallery returns HTTP 404 in production mode; no gallery link or illustrative content is served there.
- [x] FE-1.2 — shadcn Button, Input, Select, Textarea, Checkbox, RadioGroup, Switch, Badge/Tag, Tooltip, Dialog, Sheet, DropdownMenu, Tabs, Separator, and Sonner toast.
- [x] FE-1.3 / FE-1.7 — PageHeader, SectionCard, MetricCard/MetricDelta, AlertItem, IntegrationHealthCard, Timeline, DetailDrawer, ConfirmDialog.
- [x] INT / JOB / database — Not applicable; no integrations, jobs, tables, migrations, or data fetching added.
- [x] TEST-1.1–1.7 — Route smoke, axe, responsive/keyboard, table fixtures (0/1/200), URL round-trip, all statuses, and token enforcement implemented.
- [x] Visual review — Inspected actual desktop/mobile screenshots plus close-ups of empty/error/loading/controls; fixed mobile control sizing and close-button clearance. Verified internal table scrolling with all columns visible.
- [x] Final checks — Lint, typecheck, formatting, 8 unit tests, 10 development browser tests, production build and production gallery/paint test pass locally. Browser route checks report no runtime or hydration errors. All sidebar links fit 1280×720; date validation recovers when either date is corrected. Working-tree secret scanning also handles tracked files moved/deleted by the user.
- [x] Definition of Done — Final operator approval of the refined application was explicitly granted on 2026-09-11 (Asia/Jakarta). Source: the operator's latest Phase 1 closure instruction in this project conversation: “The Phase 1 operator acceptance gate is now APPROVED.” No further changes were requested.

All eight Phase 1 acceptance criteria and the Definition of Done are satisfied by technical evidence and final human acceptance. The primary navigation remains Today, Performance, Leads, Funnel, Experiments, Playbook, Workflows, Reports, Integrations, and Settings, grouped under Workspace / Operations / Administration. `/login` remains outside primary navigation.

Historical closure verification (`df631bc`): source files were unchanged from the tested implementation; unit tests, formatting, secret scanning, and Git scope were rechecked before committing. No business-layer or migration changes were introduced. The operator's pre-existing prompt-file move was preserved outside the commit.

Remote CI remains externally unverified as accepted during Phase 0 because no remote repository is configured. No public deployment was made. Future issues below remain deferred; Phase 2 has not begun.

### Operator UI/UX refinement — 2026-09-11 (Asia/Jakarta)

- **Feedback:** reduce the reporting band, remove the ambiguous “To · Jakarta” label, bring date controls into the page-title context, and avoid stretching the Performance connection message. Preserve sidebar groups, routes, brand, accessibility, phase messaging, and honest product states.
- **Refined:** removed the reporting band and shortened the breadcrumb bar. The shared server-rendered `PageHeader` places a compact date-range button beside the title/actions on desktop and below the context on mobile. It opens the existing shadcn/Radix dialog with native From/To inputs; no dependency added. URL values, invalid-range recovery, Apply, Reset, Escape cancellation, and focus return remain functional. Asia/Jakarta is unchanged and appears in dialog context, separate from field labels.
- **Layout:** added a standard `className` override to `SectionCard`; the Performance informational card uses `max-w-3xl`. The existing wide page container, responsive CSS grids, and full-width table pattern remain intact. No speculative dashboard widgets were added. Mobile native date fields retain a visible gap and at least 44px height.
- **Browser evidence:** Playwright interacted with the actual rendered application at 1280, 1920, and 390px. Reviewed Today, Performance, Leads, Experiments, and development Gallery screenshots, plus mobile navigation and the open date dialog. Verified title placement, date controls, responsive wrapping, no document overflow, table scrolling, keyboard focus/trapping/return, invalid dates, reloads, cancellation, and reset. Screenshots are generated under `test-results/refinement-*` and `test-results/phase1-*` (ignored artifacts).
- **Quality gates:** formatting, lint, typecheck, 8 unit tests, all 10 development Playwright tests, production build, secret scan, and the production gallery/paint test pass locally. Axe reports zero WCAG A/AA violations on the five representative routes and the open date dialog at all three widths. Production gallery returns 404; local paint budget passes. Git diff review confirms no navigation config, business-layer, migration, dependency, integration, or authentication changes.
- **Operator gate — APPROVED:** the operator completed the final visual review and approved the application shell, navigation hierarchy, sidebar structure, page-header hierarchy, compact date-range control, responsive layout direction, integration card/grid pattern, honest not-connected/not-activated states, and overall Du Anyam Performance Marketing OS visual direction. This is final approval of the refined implementation, superseding the pending-review state.
- **Final closure evidence:** no application or test source changes occurred after the passing refinement browser run and production build/test. Closure rechecked 8 unit tests, formatting, secret scanning, and Git diff/scope; the existing lint, typecheck, build, browser, accessibility, responsive, and production-gallery evidence remains valid. No Phase 2 functionality or fabricated product/performance data was introduced. The final commit includes the operator's existing Phase 1 prompt move into `Docs/Prompt/Done/`, verified as an unchanged-content archive move. Phase 2 remains unstarted.

## Phase 2 — Authentication & Security Foundation

Status: **FAIL / gate incomplete — all local technical gates pass; protected deployed authentication remains unverified.** Date: 2026-09-12, Asia/Jakarta. This does not revoke the Phase 0/1 completion evidence.

### Scope and requirements

- [x] Read the Master PRD, active Phase 2 and referenced security/data/frontend sections, and control documents. Verified the previous phase's clean `main` baseline at `a333ab2073ec510a8022d30af48c2b5b1921bafa` and reran its technical gates before implementation.
- [x] FR-2.1–2.5 / BE-2.2–2.3 / FE-2.1–2.2, FE-2.4 — invite-only email magic links, verified server session, protected app routes, safe internal `next`, trigger provisioning, account sign-out, and two-tab session-loss handling. No signup UI or automatic user creation on sign-in.
- [x] FR-2.6 / BE-2.1 — identity migration and RLS on both tables; no anon access; profile isolation and restricted column grants. Forward migration 0003 completes all documented settings defaults without editing applied 0002.
- [x] FR-2.7–2.8 / BE-2.4 / FE-2.3 — Settings profile/preferences, Zod rejection, input preservation, audited setting writes, known-key fallback and unknown-key warning, recoverable missing-profile state.
- [x] FR-2.9 / BE-2.5 — owner authorization centralized in `can(action)`; role metadata is not trusted or user-writable.
- [x] FR-2.10 / BE-2.6 — real server-derived environment badge; generated database types; guarded admin client. Client bundle scan is a required final gate below.
- [x] NFR-2.1–2.3 — `getUser()` validation on protected requests and independent protected layout/actions; generic auth failures; HttpOnly, Secure, SameSite=Lax cookies. Proxy overwrites the route header rather than trusting client input.
- [ ] INT-2.1 — first protected deployment and auth verification on its URL. Supabase project ref is now supplied and the operator reports an imported Vercel project with a failed initial build; deployed configuration and authentication remain unverified. See the modern API-key recovery entry below.
- [x] JOB-2 — none. Phase 3+ business features, integrations, jobs, role UI, password-reset flows, AI and n8n remain unimplemented. Synthetic identities exist only in local tests; no fake product/performance data was added.

### Technical and browser evidence

- [x] TEST-2.1 — every protected skeleton, detail and gallery path rejects anonymous requests, including forged middleware/route headers.
- [x] TEST-2.2 — settings destination survives real email sign-in; hostile/external `next` values and malformed callbacks cannot escape the application. Unit cases cover encoded backslashes, control characters and traversal.
- [x] TEST-2.3 — executable SQL transaction test verifies profile A/B isolation, no cross-user writes, no role escalation, no audit forgery, provisioning and anonymous denial; transaction rolls back synthetic data.
- [x] TEST-2.4 — malformed/unknown/missing settings safely default; Zod rejects invalid writes; a rejected profile form preserves input; missing profile shows a recoverable state.
- [x] TEST-2.5 — Playwright accepts a real Supabase invitation token, requests and follows a magic-link email captured by local Mailpit, saves profile/preferences, verifies audit metadata and cookie flags, then signs out and checks both tabs.
- [x] TEST-2.6 — `npm run secrets:client` scans `.next/static` and confirms the configured service-role key is absent from browser artifacts.
- [x] Lint, strict typecheck, formatting, 11 unit tests, all 13 development Playwright tests, production build and repository secret scan passed. npm audit reported zero vulnerabilities. Secret scanning includes Supabase secret-key and JWT shapes as well as the existing patterns.
- [x] Clean `npm ci` passed: 535 packages installed, 536 audited, zero vulnerabilities. The first attempt met a Windows file lock while CLI was running; the retry after CLI completion passed. Existing ESLint 9 is deprecated upstream but retained within the pinned Next.js-compatible baseline; no unrequested toolchain upgrade.
- [x] Clean local reset applied 0001, 0002 and 0003; schema lint and SQL RLS/provisioning/audit tests passed afterwards. Regenerated types are byte-for-byte identical to the pre-reset output. The CLI emitted a non-fatal `MaxListenersExceededWarning` during type generation; exit status was zero and schema/type checks passed.
- [x] Production-mode browser test passed: genuine invited session reaches Today, environment badge is PROD, gallery returns 404, no gallery content/link is served, local first-contentful-paint is within 1.5 seconds, sign-out clears access and Settings returns to login with `next`. Production startup was a fresh Next server on local port 3100; this is not a deployed-environment claim.
- [x] Browser interaction and visual inspection: Settings at 1280, 1920 and 390px; functional Login; keyboard account-menu open/Escape/focus return; no overflow. All Phase 1 responsive/date/table/dialog tests pass. Axe finds zero violations on Login, Settings and representative shell/gallery routes. Mobile breadcrumb composition was shortened to accommodate Account while retaining the approved navigation groups.
- [x] Local signup configuration verified in the running Auth container: `GOTRUE_DISABLE_SIGNUP=true` and email provider enabled. Direct self-signup fails. This is **not** Supabase dashboard evidence.
- [x] Fixed issues found by tests: canonical callback origin to preserve cookies, menu form unmount before logout, invalid-input reset, and mobile header wrapping. The 13-navigation regression test allows 60 seconds for cold development compilation and real Auth requests; its assertions remain unchanged.

### Acceptance and Definition of Done

- [ ] Login/logout/`next` round-trip verified on a **deployed** protected URL.
- [x] Self-signup impossible locally; remote dashboard evidence remains pending.
- [x] Profile automatically provisioned for an invited identity.
- [x] RLS enabled on both tables, no anon grants/policies, isolation tested.
- [x] Settings validation, round-trip and audit fields verified locally.
- [x] External redirects rejected.
- [x] No service-role key in browser output.
- [x] Four required commands pass: lint, typecheck, unit tests, build.

**Definition of Done is not yet satisfied:** a fresh browser must authenticate on the protected deployed environment. Local success cannot substitute for INT-2.1, remote signup-console verification, or this deployed-browser requirement. Deployment steps and evidence requirements are in `INTEGRATIONS.md`; GitHub CI evidence is recorded separately below.

### Skills and implementation review

Ponytail was read and applied for minimal scope, native forms and existing UI primitives. Installed Next.js authentication/proxy/Server Action guidance and official Supabase Auth/SSR guidance informed implementation. No installed Supabase/PostgreSQL/authentication/security/Superpowers skill was found or claimed. Used local Supabase CLI, Docker/PostgreSQL, Vitest, Playwright/axe, rendered screenshots, ESLint/TypeScript/Prettier, npm audit and Git review. D-006 records the actual auth/settings choices; existing business issues are not resolved speculatively.

Final scope review covers tracked changes and new files: auth clients/helpers, proxy/callback, account service/forms, settings schema/repository/page, migrations/templates/SQL test, generated types, local auth test fixtures, CI/test/security scripts and updated control documents. Supabase data access is confined to repositories, the sole role comparison is in `can()`, and no domain/integration implementation or navigation configuration changed. Changes remain uncommitted on `main`; no remote exists. Evidence screenshots and browser reports remain in ignored `test-results/` and `playwright-report/`.

## Phase 2 deployment verification attempt — 2026-09-12, 07:33 WIB

**Result: FAIL / externally blocked.** The deployment-only closure instruction was reviewed against Phase 2 INT-2.1, its acceptance criteria and Definition of Done. No application, migration, dependency or architecture change was needed or made during this attempt.

| Requested verification                                                                 | Concrete evidence                                                                                                                                                                                                                                                                                    | Result                                                              |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1. GitHub remote and pushed Phase 2 state                                              | `git remote -v` returns no remote. Branch is `main`; HEAD remains Phase 1 commit `a333ab2073ec510a8022d30af48c2b5b1921bafa`. Phase 2 changes remain uncommitted.                                                                                                                                     | Blocked: target repository required                                 |
| 2. Committed GitHub Actions execution                                                  | GitHub CLI is authenticated as `Dyrnzefanya`. Connector repository search for `Dyrn-Digitaldashboard` returned no result; the active account's repository listing did not identify the intended project. The edited CI workflow exists locally, but no matching remote commit/run can be identified. | Not executed remotely                                               |
| 3–5. Supabase development project and invite-only Auth                                 | No `supabase/.temp/project-ref`; `supabase projects list -o json` fails because no access token is provided. Local Supabase origin remains `http://127.0.0.1:54321`.                                                                                                                                 | Remote project, Auth settings and signup rejection unverified       |
| 6. Protected Vercel deployment                                                         | No `.vercel/project.json`, no Vercel CLI on PATH, no auth file in the checked standard Windows CLI locations, no Vercel connector, and browser inventory reports no connected browser.                                                                                                               | Deployment and host protection unverified                           |
| 7–8. Deployed environment contract and redirect URLs                                   | Local `APP_BASE_URL=http://127.0.0.1:3000`, `APP_ENV=development`. Only URL origins and environment classification were inspected; secret values were not printed.                                                                                                                                   | Deployed variables and Supabase site/redirect allowlists unverified |
| 9–13, 16. Deployed login/logout, protected routes, persistence, redirects and two tabs | No deployed URL or authenticated account access was supplied. Existing local browser fixtures intentionally refuse remote Supabase.                                                                                                                                                                  | Not executed on a deployment                                        |
| 14. Secrets absent from deployed browser assets                                        | Repository secret scan passes again. No deployed browser assets are available to inspect; prior local production-bundle scan remains passing evidence only for that build.                                                                                                                           | Remote asset scan pending                                           |
| 15. Development-project RLS                                                            | Local migration and RLS evidence remains unchanged. No remote development project connection is available.                                                                                                                                                                                           | Remote RLS verification pending                                     |

Rechecked `git diff --check` and repository secret scanning: both pass. No changes were found in the existing domain/integration implementation paths or navigation configuration. The existing full local quality-gate results above remain the implementation evidence; no redundant application test suite was run for this documentation-only attempt.

The operator was asked for the intended GitHub repository, Supabase development project reference, protected Vercel project/deployment URL, and account connections through normal sign-in flows (no secrets in chat). No answer was available during this attempt. No substitute repository, account, or public deployment was selected. No push, remote CI run, remote migration, deployment or final closure commit occurred. The working tree remains dirty with the Phase 2 implementation and evidence updates.

**Next required action:** identify/connect those existing targets, then execute the checklist in `INTEGRATIONS.md` and record the remote commit/run/deployment evidence. Phase 2 stays FAIL until all mandatory remote gates pass; Phase 3 remains unstarted and not ready.

## Phase 2 GitHub publication — 2026-09-12

The operator explicitly selected `https://github.com/Dyrnzefanya/GrowthCockpit` and authorized committing the existing Phase 2 implementation/documentation and pushing `main`. Verified the local branch is `main`, the target repository has no existing refs, and configured that URL as `origin`. Existing Phase 0/1 commits remain the ancestors of the Phase 2 implementation commit; no history rewrite or force push is required.

Before publication, scanned the existing Git history and publishable working-tree files for secret patterns and the configured privileged Supabase key. No findings; `.env.local` remains ignored. The only tracked environment file is the existing blank `.env.example` contract. Repository secret scanning and `git diff --check` pass. Existing Phase 2 local gate evidence above is retained; this publication does not mark the deployed-auth gate complete. GitHub Actions status will be checked against the pushed commit and reported to the operator.

The earlier deployment-attempt findings above are historical evidence. GitHub repository selection is now resolved; Supabase/Vercel connections and deployed acceptance verification remain outstanding. Phase 3 remains unstarted.

## Phase 2 modern API-key alignment and deployment recovery — 2026-09-12

**Status: local recovery gates PASS; Phase 2 remains FAIL / deployed gate incomplete.** Operator selected Supabase development ref `oonxnzogzzciszojract` and reported Vercel build failure from missing/invalid environment variables. No remote secret provided in the conversation was copied into commands, source, documentation or local environment files. The operator must rotate that disclosed privileged key and enter the replacement directly in Vercel.

- [x] Inspected `.env.example`, schemas/modules, all three Supabase factories, proxy/auth flow, tests, CI/build assumptions, installed SDK/Next.js guidance, PRD and control documents before modification. Legacy public key was used by browser/server session clients; the legacy privileged key was confined to the admin factory and Node test infrastructure.
- [x] D-007 records the operator-approved replacement: public `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; server-only `SUPABASE_SECRET_KEY`, `APP_ENV`, `APP_BASE_URL`, `APP_TIMEZONE`. No legacy fallback or `NEXT_PUBLIC_APP_ENV`. The installed SDK/SSR supports the current key model without an upgrade.
- [x] Updated environment validation, client wiring, CI's local key exports, fixtures and browser-secret scan. Public validation rejects secret/legacy key types; all six required core variables fail clearly by name when missing. Regression tests verify the public parse result excludes server configuration.
- [x] Formatting, lint, typecheck and 13 unit tests pass. All 13 development Playwright tests pass using the local CLI's actual modern keys, including real invitation/magic-link auth, settings audit, signup rejection, redirects, secure cookies, two tabs, missing profiles, accessibility and responsive regression.
- [x] Production build, browser-key scan and production Playwright test pass with the new contract. Authenticated Today, sign-out, protected Settings redirection, production gallery exclusion and the local paint budget remain verified.
- [x] Local schema lint, RLS/provisioning/audit SQL tests and migration listing pass; only versions 0001–0003 are applied. No migration, policy, auth/proxy/service behavior, component or navigation change. No remote database reset or migration attempt.
- [x] Repository secret scan, npm audit (zero vulnerabilities) and complete diff/scope review pass. Modern local test keys were supplied only in process environments; existing local credential files were not rewritten. The operator's concurrent prompt archive move is preserved outside this recovery change.
- [x] GitHub origin remains `Dyrnzefanya/GrowthCockpit`; the initial Phase 2 implementation commit `2a19b04d80cbe383705b57cb374372aa76c53c12` is pushed. Its [CI run 34673007011](https://github.com/Dyrnzefanya/GrowthCockpit/actions/runs/34673007011) completed successfully. The modern-key revision requires its own CI run after publication; prior CI is not evidence for the new revision.
- [ ] Operator configures the six variables in Vercel, removes legacy entries, enables required deployment protection and provides the actual target URL. Exact names, visibility, value sources and target scopes are in `INTEGRATIONS.md`.
- [ ] After operator confirmation: verify remote Supabase identity/access, safely apply only pending existing migrations, inspect remote policies/provisioning and Auth configuration, then verify the actual protected deployment, login/logout/magic links, redirects, session persistence/two tabs and deployed browser assets. Local success is not deployed evidence.

No Phase 3 feature, integration, business rule, table or dependency was introduced. Stop for manual environment configuration; do not mark Phase 2 PASS yet.

## Phase 2 remote Auth configuration recovery — 2026-09-12

**Configuration verified; deployed authenticated acceptance remains pending.** Authenticated Supabase CLI access confirmed project `growth-cockpit-dev` (`oonxnzogzzciszojract`). The initial template update was rejected because the free-tier default email provider disallowed template modification. After the operator configured custom SMTP, the selective update succeeded.

- [x] Site URL is `https://growthcockpitdyrn.vercel.app`. Redirect URLs are limited to `/auth/confirm?**` on that origin, `http://localhost:3000`, and `http://127.0.0.1:3000`.
- [x] Remote public signup is disabled (`auth.enable_signup=false`); Email provider remains enabled (`auth.email.enable_signup=true`). Fresh remote comparison matches both settings and the URL configuration.
- [x] Applied the existing `supabase/templates/magic-link.html` and `supabase/templates/invite.html` bodies using a temporary, selective CLI configuration. Magic links use `.RedirectTo`, `.TokenHash`, and `type=email`; invitations use `.SiteURL`, `.TokenHash`, `type=invite`, and `next=/today`, matching the existing `verifyOtp` callback.
- [x] CLI reported exactly two updated properties: invitation and magic-link template contents. A second invocation re-read the remote bodies and reported Auth up to date, zero changes, and nothing to push. Unrelated remote settings, including operator-managed SMTP, were preserved; no SMTP credentials were read into project files or printed.
- [x] Live HTTP probes: `/login` returns 200; anonymous `/today` returns 307 to `/login?next=%2Ftoday`; an invalid code-only callback returns 303 to the canonical `/login?error=link` URL.
- [ ] Fresh delivered-email login/invite acceptance, logout, session persistence, and two-tab behavior remain unverified on the deployment. HTTP probes and remote template equality do not establish those outcomes. Earlier outstanding deployed acceptance gates remain open.

No application code, dependencies, migrations, or Phase 3 functionality changed. No email was sent by this configuration operation; old emails retain their original links. No application redeployment is required for these remote Auth settings.

## Phase 2 deployed verification and closure attempt — 2026-09-12

**Final status: FAIL / deployed acceptance incomplete.** The operator explicitly confirmed successful production login at `https://growthcockpitdyrn.vercel.app`. This satisfies operator-observed deployed magic-link login evidence, but does not establish logout, session persistence, settings round-trip, or two-tab behavior.

Remote database inspection found no public tables, policies, provisioning trigger, or migration history. Linked the explicitly selected project and safely applied existing migrations `0001`–`0003`. The pre-existing Auth account then lacked a profile; forward-only `0004_identity_backfill` repaired this sequencing defect using the original provisioning semantics (D-006). Existing migrations were not edited. Remote readback confirms both public tables with RLS, all four intended authenticated policies, the provisioning trigger, migration history `0001`–`0004`, and zero missing profiles. No remote reset occurred.

| Gate                                                     | Actual evidence                                                                                                                                                                                                                                             | Status                                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| FR-2.1 deployed login                                    | Operator explicitly reports successful production login                                                                                                                                                                                                     | PASS for login only                                                                            |
| FR-2.2 / TEST-2.1 anonymous protection                   | Deployed Playwright Chromium/API probes verify all 11 operational routes redirect to `/login?next=...`                                                                                                                                                      | PASS                                                                                           |
| FR-2.3 signup restriction                                | Public Auth settings show signup disabled and Email enabled; direct public signup returns HTTP 422 `signup_disabled`                                                                                                                                        | PASS                                                                                           |
| FR-2.4 provisioning and FR-2.6 / TEST-2.3 RLS            | Remote transactional `identity.sql` passes provisioning, missing-profile regression, isolation, cross-user update rejection, role/audit restrictions and audit actor checks; transaction rolls back; anonymous REST reads return 401 for both tables        | PASS                                                                                           |
| TEST-2.2 redirect safety                                 | Deployed external `next` login remains on the canonical origin; invalid token callback redirects to canonical `/login?error=link`                                                                                                                           | PASS for negative paths; authenticated round-trip pending                                      |
| TEST-2.6 deployed browser exposure                       | Ten login-page browser assets scanned with zero recognizable modern secret-key, management-token, service-role JWT or private-key patterns                                                                                                                  | Partial: authenticated-route assets and exact deployed privileged-value comparison unavailable |
| FR-2.5 / TEST-2.5 deployed logout, persistence, two tabs | Browser connector inventory has no connected browser or operator session; isolated Playwright has no approved authenticated test session                                                                                                                    | NOT VERIFIED                                                                                   |
| FR-2.7 deployed settings round-trip and cookie flags     | Remote SQL audit behavior passes; deployed authenticated UI and session cookies unavailable                                                                                                                                                                 | NOT VERIFIED                                                                                   |
| INT-2.1 host deployment protection                       | Canonical public login is reachable; Vercel project protection settings have not been independently verified                                                                                                                                                | NOT VERIFIED                                                                                   |
| Local regression                                         | Formatting, lint, typecheck, 13 unit tests, 13 Playwright tests including axe/auth/two-tabs, build, local production browser test, SQL RLS tests, schema lint, generated types comparison, client/repository secret scans, npm audit (zero vulnerabilities) | PASS                                                                                           |
| GitHub CI                                                | Deployed commit `8ee244274d2cba6a5b2628c9063614c28c9a9c49` passed [run 34674600004](https://github.com/Dyrnzefanya/GrowthCockpit/actions/runs/34674600004); repair revision requires its own post-push CI verification                                      | Prior commit PASS                                                                              |

The first local build correctly rejected a missing modern publishable-key variable in the old local environment file. The passing rerun supplied the local CLI's modern keys only as process environment variables; no remote privileged value was copied into files. Generated database TypeScript types remain unchanged because the repair changes rows only. The existing operator prompt archive move was verified byte-for-byte unchanged and is preserved in the commit.

**Definition of Done remains unsatisfied.** Connect an authenticated production browser (or provide explicit operator evidence for the remaining browser checks) and Vercel project-settings access, then finish deployed verification before marking PASS. No Phase 3 feature, table, integration, or job was introduced. Phase 3 remains not ready and unstarted.

## Known future decisions and issues (preserved)

- **Phase 6:** resolved in D-011/D-012; preserve the operational UAT backlog. Spend-dependent metrics remain unavailable until Phase 10.
- **Phase 7:** local foundation decisions resolved in D-013. Source registration, host protection, hosting plan and deployed scheduler evidence remain pending; scheduler-wide outage alerting belongs to Phase 9.
- **Phase 8:** manual qualification override versus HubSpot lifecycle authority resolved by D-014; external configuration/UAT remains pending.
- **Phase 9:** Slack INFO routing.
- **Phase 11:** R-01 versus R-02 sample-gate precedence.
- **Phase 13 / deployment planning:** production and real-data sequencing where still applicable.

These are not Phase 0 blockers and must not be resolved speculatively.
