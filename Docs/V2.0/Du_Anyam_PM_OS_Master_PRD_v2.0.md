# DU ANYAM — PERFORMANCE MARKETING OS

**Master Product Requirements Document, Technical Blueprint & Development Protocol**

| | |
|---|---|
| Version | **2.0** (supersedes v1.0, September 2026) |
| Status | Implementation-ready — source of truth for all Codex development sessions |
| Product type | Private internal web application, single primary user |
| Owner | Performance Marketing Specialist, Du Anyam (PT Karya Dua Anyam) |
| Document language | English (technical spec). Product UI copy: Bahasa Indonesia. |

> **Rule of precedence.** If any other document, prompt, chat instruction, or code comment conflicts with this file, **this file wins**. Changes to this document are a deliberate act: update the Change Log, do not silently drift.

---

## 1. Executive Summary

Du Anyam Performance Marketing OS (**PM OS**) is a private internal web application that turns performance marketing from a collection of dashboards into a **daily operating system**.

It answers six questions in sequence:

**What happened? → Why? → What should I do? → How do I do it? → What happened after I did it? → What did we learn?**

PM OS is not a dashboard, not a CRM, and not an ad manager. It is the **operating layer, analytics layer, and decision layer** that sits on top of systems that already own their data: HubSpot owns CRM truth, ad platforms own spend truth, Slack carries alerts, n8n moves data.

The product is deliberately **manual-first**. Phases 2–5 deliver a system that is useful with zero external integrations. Integrations increase leverage; they never determine whether the product works.

### 1.1 What changed from v1.0

v1.0 was a strong strategic outline but was not implementable without guessing. v2.0 adds testable requirement IDs, a corrected data model, an explicit single ingestion path, defined qualification and decision rules, timezone/currency semantics, per-phase acceptance criteria, and a phase-gate protocol for Codex. See `AUDIT_REPORT.md` for the full list and rationale.

---

## 2. Product Vision

A single surface where the Performance Marketing Specialist starts every workday, decides what matters in under two minutes, executes with a documented playbook, records every meaningful change as an experiment, and closes the week with a report generated from work already captured — not re-typed.

Long term, PM OS becomes Du Anyam's internal Growth OS: multi-channel, multi-user, with AI assistance layered on top of a trustworthy structured record. That future must be reachable **without rewriting the foundation**, which is why the data model is channel-agnostic and event-based from day one.

---

## 3. Product Goals & Success Metrics

| # | Goal | Success metric | Target (first 90 days of use) |
|---|---|---|---|
| G1 | Daily prioritisation in under 2 minutes | Time from login to a decided action list | ≤ 2 min, self-reported weekly |
| G2 | The app is actually used | Days with a completed daily workflow run | ≥ 4 workdays/week |
| G3 | Decisions are documented | Material campaign changes with a linked experiment or note | 100% |
| G4 | Lead quality is visible, not just lead volume | Share of leads with a resolved qualification status within 48h | ≥ 90% |
| G5 | Attribution is reliable enough to act on | Share of leads with a resolvable campaign/source | ≥ 70%, trending up |
| G6 | Reporting is assembled, not re-typed | Weekly report produced from stored data with ≤ 15 min manual editing | ≥ 4 of 5 weeks |
| G7 | Silent failure is hard | Integration failures surfaced within one sync window | 100% of failures produce an alert |

**Anti-metric (watch for):** number of screens, number of charts, number of automations. Growth in these without growth in G1–G3 is a failure signal.

---

## 4. Non-Goals

PM OS will **not**, in any phase covered by this document:

1. Replace HubSpot as CRM system of record.
2. Write campaign changes back into any ad platform (no automated budget, status, or bid changes).
3. Become a multi-tenant SaaS product.
4. Store or process payments, contracts, or invoices.
5. Act as an email marketing or outbound sequencing tool.
6. Provide autonomous AI decision-making. AI, when added, drafts narrative over facts the system already holds.
7. Be a WhatsApp inbox or conversation client.
8. Serve as an enterprise data warehouse or a BI tool for other departments.

---

## 5. Users & Jobs To Be Done

**Primary user (MVP): Performance Marketing Specialist.** Single operator, desktop-first, Asia/Jakarta.

**Designed-for-later roles (schema carries `profiles.role`, no UI in MVP):** Marketing Lead (read + comment), Sales (lead follow-up queue), Management (report view only).

| JTBD | Outcome the user needs | Primary surface |
|---|---|---|
| J1 Start the day | Know the 3–5 highest-impact actions | `/today` |
| J2 Diagnose the funnel | Know where spend→revenue leaks | `/performance`, `/funnel` |
| J3 Judge lead quality | Not be fooled by cheap but useless leads | `/leads`, lead quality view |
| J4 Run a disciplined test | Know what is being tested, why, and the result | `/experiments` |
| J5 Chase sales progress | Know which leads have no status or are overdue | `/leads` follow-up queue |
| J6 Report | Produce a weekly recap with minimal typing | `/reports` |
| J7 Recall procedure | Find the SOP for launch / QA / troubleshooting | `/playbook` |
| J8 Trust the numbers | Know immediately when data is stale or broken | `/integrations` + data health strip |

---

## 6. Product Principles

| P | Principle | Consequence for implementation |
|---|---|---|
| P1 | **Action-first, not metric-first** | Every screen must end in a decision or a next step. A metric with no comparison and no implied action does not ship. |
| P2 | **One source of truth per fact** | HubSpot owns CRM state. Ad platforms own spend. PM OS owns workflow, experiments, alerts, decisions, and derived analytics. Never two writers for one fact. |
| P3 | **Degrade, never block** | Any integration may fail without making the app unusable. Every screen must render with missing upstream data, clearly labelled as missing. |
| P4 | **Diagnostic before optimisation** | If input data is stale or attribution coverage is below threshold, the system suppresses optimisation verdicts and recommends measurement instead. |
| P5 | **Deterministic before intelligent** | Rules with visible evidence beat model output the user cannot audit. No AI in MVP. |
| P6 | **Manual-first delivery** | Every module must be usable with hand-entered data before its integration is built. |
| P7 | **Everything countable is versioned** | Qualification rules, decision rules, attribution rules and reports carry a version so historical output stays explainable. |
| P8 | **Boring technology, narrow surface** | No new dependency, table, service, or abstraction without a written reason in `DECISIONS.md`. |

---

## 7. Scope

### 7.1 MVP — Must have (Phases 0–8)

Authentication and app shell · Daily workflow & checklist engine · Today page (progressive) · Playbook/SOP · Experiment OS · Lead, contact, company, deal model with manual entry and CSV import · Qualification engine · Funnel views · Signed lead-ingest API · n8n foundation · HubSpot two-way-lite sync · Alerts with dedupe · Slack outbound notifications · Integration health.

### 7.2 Phase 2 — Should have (Phases 9–12)

Meta Ads daily ingest · Performance & campaign diagnostics · Deterministic decision engine and priority scoring · Weekly report generation and snapshotting · Observability, security hardening, production deployment.

### 7.3 Phase 3 — Advanced (post-v1, not specified here beyond intent)

GA4 / GTM website metrics · Google Ads connector · Ad-level (adset/ad) granularity with creative-naming parsing · Offline conversion upload · Monthly reporting and cohort analysis · Role-based views.

### 7.4 Future

AI copilot over the structured record · WhatsApp conversation SLA metrics · Creative intelligence (angle/hook/visual performance) · Predictive pacing and forecasting · LinkedIn & TikTok connectors · Multi-touch attribution · Approval workflows · Autonomous optimisation (explicitly gated behind human approval).

### 7.5 Scope guard

A feature enters MVP only if removing it would make a **daily** job impossible. Anything used weekly or less starts as a manual procedure documented in the Playbook.

---

## 8. Functional Requirements — Global Index

Requirements are specified in full inside each phase (Section 35) with IDs `FR-<phase>.<n>`. This index exists so a reader can locate a capability without reading every phase.

| Capability area | Phase | Requirement range |
|---|---|---|
| Project foundation, env validation, CI | 0 | FR-0.1 – FR-0.6 |
| Auth, shell, settings, RLS baseline | 1 | FR-1.1 – FR-1.10 |
| Daily workflow, checklist, notes, Today v1 | 2 | FR-2.1 – FR-2.11 |
| Playbook & SOP | 3 | FR-3.1 – FR-3.8 |
| Experiment OS | 4 | FR-4.1 – FR-4.11 |
| Lead / contact / company / deal, funnel, qualification | 5 | FR-5.1 – FR-5.16 |
| Lead ingest API, webhook safety, n8n foundation | 6 | FR-6.1 – FR-6.11 |
| HubSpot integration | 7 | FR-7.1 – FR-7.13 |
| Alerts & Slack notifications | 8 | FR-8.1 – FR-8.11 |
| Paid media ingest & performance surfaces | 9 | FR-9.1 – FR-9.12 |
| Decision engine & Today v2 | 10 | FR-10.1 – FR-10.10 |
| Reporting | 11 | FR-11.1 – FR-11.9 |
| Observability, hardening, production | 12 | FR-12.1 – FR-12.10 |

---

## 9. Non-Functional Requirements (global)

These apply to every phase. Phase-specific NFRs are additive, never contradictory.

| ID | Category | Requirement | Verification |
|---|---|---|---|
| NFR-G1 | Performance | Any authenticated page renders first meaningful content ≤ 2.0 s on a 10 Mbps connection with warm cache; server data functions complete ≤ 800 ms p95 for datasets up to 50k leads / 200k metric rows. | Manual timing + query `EXPLAIN ANALYZE` on the largest tables. |
| NFR-G2 | Reliability | No unhandled promise rejection or uncaught exception may render a blank page. Every route has an error boundary and a loading state. | E2E failure tests. |
| NFR-G3 | Availability semantics | The app must remain usable when HubSpot, Slack, Meta or n8n are down. Upstream failure shows a degraded state, never a crash. | Integration kill-switch test (Phase 12). |
| NFR-G4 | Security | No secret is ever exposed to the browser. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be public. RLS enabled on every table in `public`. | `grep` in build output + RLS audit script. |
| NFR-G5 | Privacy | Lead PII (name, email, phone, message) is never written to application logs, Slack messages, n8n node names, or error trackers. Slack carries identifiers and links, not personal data. | Log review checklist per phase. |
| NFR-G6 | Data integrity | Every externally-sourced row carries `external_id`, `source_system`, `source_updated_at`, `synced_at`. Every write from an integration is idempotent. | Replay test: same payload twice → one row. |
| NFR-G7 | Maintainability | Strict TypeScript, no `any` without an adjacent `// why:` comment, domain logic isolated from React components, integrations behind service modules. | `tsc --noEmit`, lint rule, code review. |
| NFR-G8 | Accessibility | Keyboard-operable navigation; status never conveyed by colour alone (icon + text label); form fields have labels; contrast ≥ 4.5:1 for text. | Axe pass on `/today`, `/leads`, `/experiments`. |
| NFR-G9 | Observability | Every integration execution writes an `integration_runs` row with a `correlation_id`. Every rule evaluation writes a `rule_evaluations` row. | Query check per phase. |
| NFR-G10 | Time correctness | All timestamps stored as `timestamptz` in UTC. All business dates computed in `Asia/Jakarta`. No naive date arithmetic in application code. | Unit tests on the date utility, including DST-free UTC+7 boundaries and month edges. |
| NFR-G11 | Portability | No vendor lock-in beyond Supabase (Postgres) and Vercel (standard Next.js). No Postgres extension beyond `pgcrypto`, `citext`, `pg_cron` (optional). | Dependency review. |
| NFR-G12 | Auditability | Any change to thresholds, qualification rules or a lead's stage is recorded with actor and timestamp. | `lead_stage_events`, `app_settings.updated_by`. |

---

## 10. System Architecture

```
  Landing pages / forms        WhatsApp (CTWA)        Meta Ads API       HubSpot CRM
  (static HTML + GAS)          gateway / manual        (read only)       (system of record)
          │                          │                      │                  │  ▲
          │  HTTPS POST              │  HTTPS POST          │ scheduled pull   │  │ upsert contact/deal
          ▼                          ▼                      ▼                  ▼  │  (ingest only)
    ┌──────────────────────────────────────────────────────────────────────────────┐
    │                              n8n (orchestration)                              │
    │   relay · retry · schedule · validation of transport · correlation ids         │
    └───────────────┬─────────────────────────────────────────────┬────────────────┘
                    │ signed HTTPS (HMAC)                          │ Slack webhook
                    ▼                                              ▼
    ┌───────────────────────────────────────────────┐        ┌────────────┐
    │  Next.js (App Router) — PM OS                  │        │   Slack    │
    │  • UI + server components                      │        │  #alerts   │
    │  • Domain services: qualification, KPI, rules  │        └────────────┘
    │  • Integration services: HubSpot, Meta         │
    │  • Route handlers: /api/ingest/*, /api/cron/*  │
    └───────────────┬───────────────────────────────┘
                    │ supabase-js (server, service role) / browser (anon + RLS)
                    ▼
    ┌───────────────────────────────────────────────┐
    │  Supabase Postgres + Auth + Storage            │
    │  operational state · mirrors · analytics views │
    └───────────────────────────────────────────────┘
```

### 10.1 Responsibility boundaries

| System | Owns | Must never do |
|---|---|---|
| **HubSpot** | Contact, Company, Deal, lifecycle stage, deal stage, owner, revenue | — |
| **Ad platforms** | Spend, impressions, clicks, platform-reported results | — |
| **Supabase** | Workflow runs, playbook, experiments, alerts, rule evaluations, reports, mirrors of the above, derived analytics | Become a second CRM writer of stage/owner data |
| **Next.js (PM OS)** | All business logic: qualification, KPI computation, decision rules, attribution resolution, report assembly | Hold secrets client-side; duplicate logic that n8n also implements |
| **n8n** | Transport, scheduling, retries, fan-out, digest batching, correlation | Implement business rules, compute KPIs, or decide lead quality |
| **Slack** | Human notification and coordination | Hold state that is not also in PM OS or HubSpot |

> **AD-04 (binding).** Business logic lives in **one** place: the Next.js domain layer. n8n calls PM OS endpoints; it does not re-implement qualification, scoring, or metric formulas. If a rule must change, it changes in one repository, not in a workflow canvas.

### 10.2 Development tooling (not runtime)

Codex is the implementation agent. It is a **development-time** dependency only and appears nowhere in the runtime architecture. Model identifiers and vendor documentation URLs are intentionally excluded from this document because they change faster than the product; keep them in `DECISIONS.md` with the date they were verified.

---

## 11. Technology Stack

| Layer | Choice | Version policy | Rationale |
|---|---|---|---|
| Framework | Next.js, App Router | Pin exact minor in `package.json`; upgrade deliberately | Server components remove most client data-fetching |
| Language | TypeScript, `strict: true` | — | Contracts across four integrations |
| UI | Tailwind CSS + shadcn/ui | Components vendored into `components/ui` | Internal-tool speed, accessible primitives |
| Forms | React Hook Form + Zod | — | One validation schema shared by form and API |
| Validation | Zod (single source of truth for all external payloads) | — | Every external input is parsed, never trusted |
| Charts | Recharts | — | Sufficient for KPI/trend/funnel |
| Tables | TanStack Table | — | Leads and campaign tables need sort/filter/column control |
| Dates | `date-fns` + `date-fns-tz` | — | Asia/Jakarta business-date conversion |
| Icons | lucide-react | — | — |
| Data access | `@supabase/supabase-js` inside typed repository modules; types generated by `supabase gen types typescript` | — | **AD-09**: no ORM in MVP; one less abstraction to debug |
| Migrations | Supabase CLI SQL migration files, committed, forward-only | — | Codex must never mutate schema outside a migration file |
| Client state | URL search params + server components. `zustand` only with a `DECISIONS.md` entry | — | Avoid global state for a single-user internal tool |
| Server cache | Next.js `revalidate` + tag-based revalidation. TanStack Query only for genuinely interactive polling surfaces | — | — |
| Testing | Vitest (unit/integration), Playwright (E2E), `@testing-library/react` | — | — |
| Lint/format | ESLint (next + @typescript-eslint) + Prettier | — | — |
| CI | GitHub Actions: lint → typecheck → test → build on every PR | — | Phase gate automation |
| Hosting | Vercel (app), Supabase (db/auth), self-hosted VPS (n8n) | — | — |

**Dependency rule.** Any package not listed above requires a `DECISIONS.md` entry stating the problem, the alternative considered, and the bundle/maintenance cost.

---

## 12. Application Architecture

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (app)/today/                 layout.tsx guards the whole group
│   ├── (app)/performance/
│   ├── (app)/funnel/
│   ├── (app)/leads/ , leads/[id]/
│   ├── (app)/experiments/ , experiments/[id]/
│   ├── (app)/playbook/ , playbook/[slug]/
│   ├── (app)/workflows/
│   ├── (app)/reports/ , reports/[id]/
│   ├── (app)/integrations/
│   ├── (app)/settings/
│   └── api/
│       ├── ingest/lead/route.ts      signed, from n8n only
│       ├── ingest/hubspot/route.ts   HubSpot webhook receiver (Phase 7)
│       ├── cron/[job]/route.ts       invoked by n8n with CRON_SECRET
│       └── health/route.ts
├── domain/          ← pure logic, no I/O, 100% unit-testable
│   ├── metrics/     KPI formulas (single implementation)
│   ├── qualification/  MQL rules + version
│   ├── rules/       decision engine rules + version
│   ├── attribution/ UTM/click-id resolution + naming conventions
│   └── dates/       Asia/Jakarta business-date helpers
├── services/        ← orchestrates domain + repositories, may do I/O
│   ├── leads/ experiments/ workflows/ reports/ alerts/
├── repositories/    ← the ONLY place that talks to Supabase
├── integrations/    ← the ONLY place that talks to HubSpot/Meta/Slack
│   ├── hubspot/ meta/ slack/
├── components/      shell/ kpi/ charts/ leads/ experiments/ workflow/ ui/
├── lib/             supabase clients, env, logger, http, errors
├── types/           generated db types + shared domain types
└── config/          navigation, feature flags, constants
```

**Layering rule (enforced in review):** `components → services → repositories/integrations → external`. `domain/` may be imported by anything and imports nothing outside itself. A React component must never import `@supabase/supabase-js` or an integration module directly.

---

## 13. Frontend Architecture

### 13.1 UX direction

- Desktop-first (1280–1920). Must remain readable and operable at 390 px for review on mobile; data-entry-heavy screens may be read-only on mobile.
- Left sidebar navigation, top bar with global date-range control and environment badge (`DEV` / `PROD`).
- Visual priority order on every page: **alerts → recommended actions → KPI in context → detail table**.
- Status semantics: `CRITICAL` / `ATTENTION` / `HEALTHY` / `UNKNOWN` — always icon + text, never colour alone (NFR-G8).
- Every metric answers "compared with what?": previous period, target, or baseline. A bare number is a bug.
- `UNKNOWN` is a first-class state and must be visually distinct from zero. "0 leads" and "we don't know how many leads" are different facts.

### 13.2 Mandatory page states

Every data surface implements four states: **loading** (skeleton), **empty** (with the action that fills it), **error** (with the retry affordance and what still works), **stale** (data present but older than its freshness SLA — banner + last-updated timestamp).

### 13.3 Component conventions

- Server components by default; `"use client"` only for interactivity.
- Filters and date ranges live in URL search params so any view is shareable and reloadable.
- One shared `<MetricCard>` consuming a `MetricView` type: `{ value, unit, comparison, direction, isGood, freshness }` — direction goodness is data, not hard-coded per card (CPL down is good; MQL rate down is not).
- Tables: server-side pagination beyond 500 rows.

---

## 14. Backend Architecture

### 14.1 API surface rules

| Kind | Use for | Auth |
|---|---|---|
| Server Components / server functions | All in-app reads and user-initiated writes | Supabase session cookie + RLS |
| `POST /api/ingest/*` | Machine-to-machine inbound (n8n relay, HubSpot webhook) | HMAC signature + timestamp window + idempotency key |
| `POST /api/cron/[job]` | Scheduled jobs triggered by n8n | `Authorization: Bearer ${CRON_SECRET}` |
| `GET /api/health` | Liveness for uptime monitoring | Public, returns no data beyond status |

No other public API exists in MVP. There is no REST/GraphQL surface for the UI.

### 14.2 Error model

One error taxonomy shared by services and integrations:

```ts
type AppErrorCode =
  | 'VALIDATION_FAILED'      // caller sent bad data → 400, do not retry
  | 'UNAUTHENTICATED'        // 401
  | 'FORBIDDEN'              // 403
  | 'NOT_FOUND'              // 404
  | 'CONFLICT'               // idempotency / version conflict → 409
  | 'UPSTREAM_UNAVAILABLE'   // HubSpot/Meta/Slack down → 502, retryable
  | 'UPSTREAM_RATE_LIMITED'  // → 429, retryable with backoff
  | 'BUSINESS_RULE_REJECTED' // valid data, refused by domain rule → 422, do not retry
  | 'INTERNAL'               // 500
```

**Retryable vs terminal is a property of the error, not of the caller.** n8n retries only `UPSTREAM_*`, `INTERNAL`, and network errors; it dead-letters everything else. Business failures (a spam lead) and system failures (HubSpot 503) must never be logged or alerted identically.

### 14.3 Idempotency

Every inbound machine write carries `Idempotency-Key`. The handler:
1. Inserts into `webhook_events` with `idempotency_key` unique.
2. On conflict → returns the original result with `200` and `{ "replayed": true }`. It does not re-execute.
3. Business upserts key on natural keys as well (`leads.dedupe_key`, `contacts.hubspot_contact_id`, `ad_metrics_daily` unique tuple) so a lost response cannot create duplicates.

### 14.4 Rate limiting & backoff

Outbound integration clients implement bounded exponential backoff (base 500 ms, factor 2, max 5 attempts, full jitter) and honour `Retry-After`. HubSpot calls are additionally throttled client-side to stay under the documented burst limit — the limit value lives in `config/integrations.ts`, verified at implementation time, not hard-coded in call sites.

---

## 15. Database Architecture

### 15.1 Conventions (binding for every migration)

1. Primary keys: `id uuid primary key default gen_random_uuid()`.
2. Every table: `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` maintained by a shared `set_updated_at()` trigger.
3. Timestamps are `timestamptz` (UTC). Business dates are separate `date` columns computed in Asia/Jakarta at write time; never derive a business date from a timestamp in a query without the timezone cast.
4. Money: `numeric(18,2)` plus `currency char(3) not null default 'IDR'`. Never `float`. Mixed currency in one aggregate raises a data-health alert rather than silently summing.
5. Mirrored rows carry `external_id text`, `source_system text`, `source_updated_at timestamptz`, `synced_at timestamptz`.
6. Enumerations are Postgres `text` + `CHECK` constraints (cheaper to evolve than native enums), with the allowed values mirrored in `types/domain.ts`.
7. No hard deletes on operational history (`lead_stage_events`, `integration_runs`, `rule_evaluations`, `reports`, `webhook_events`).
8. Every foreign key is indexed. Every unique business key has a unique index.
9. RLS is enabled on **every** table in `public`, including tables only the service role touches.

### 15.2 Core schema (MVP)

**Identity & configuration**

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | App user profile, 1:1 with `auth.users` | `id uuid pk → auth.users`, `full_name`, `role text check in ('owner','lead','sales','viewer') default 'owner'`, `timezone default 'Asia/Jakarta'` |
| `app_settings` | All thresholds, mappings, feature flags | `key text pk`, `value jsonb not null`, `description`, `updated_by uuid`, `updated_at` |

`app_settings` is the only configuration store. Known keys are typed in `config/settings-schema.ts` and validated with Zod on read; an unknown or malformed key falls back to a documented default and raises a `WARNING` alert.

**Daily workflow (Phase 2)**

| Table | Key columns |
|---|---|
| `workflow_templates` | `key text unique`, `name`, `cadence text check in ('daily','weekly','monthly')`, `weekdays int[] null`, `steps jsonb` (`[{key,label,help,required}]`), `version int`, `is_active bool` |
| `workflow_runs` | `template_id fk`, `run_date date`, `status text check in ('pending','in_progress','completed','skipped')`, `started_at`, `completed_at`, **unique(`template_id`,`run_date`)** |
| `workflow_items` | `run_id fk`, `step_key`, `label_snapshot`, `is_done bool`, `completed_at`, `notes`, **unique(`run_id`,`step_key`)** |
| `notes` | `note_date date`, `context_type text check in ('general','lead','experiment','campaign','report')`, `context_id uuid null`, `body text`, `created_by` |

`label_snapshot` exists so editing a template never rewrites the history of what was actually checked.

**Playbook (Phase 3)**

| Table | Key columns |
|---|---|
| `playbook_articles` | `slug unique`, `title`, `category`, `article_type text check in ('sop','checklist','decision_tree','troubleshooting','reference')`, `summary`, `body_md`, `tags text[]`, `status text check in ('draft','published','archived')`, `version int`, `published_at`, `updated_by` |

Revision history is **deferred**; `version` increments on publish and the previous body is not retained in MVP. If history becomes necessary, add `playbook_article_revisions` — do not build it speculatively.

**Experiments (Phase 4)**

| Table | Key columns |
|---|---|
| `experiments` | `code text unique` (`EXP-YYYY-NNN`), `title`, `hypothesis`, `variable`, `control_description`, `variant_description`, `primary_kpi text`, `secondary_kpi text null`, `baseline_value numeric null`, `target_value numeric null`, `status text check in ('draft','running','completed','cancelled')`, `priority int`, `confidence int check 1..5`, `effort int check 1..5`, `start_date`, `review_date`, `end_date`, `platform text null`, `external_refs jsonb` (campaign/adset/ad ids, LP urls), `owner_id` |
| `experiment_results` | `experiment_id fk unique`, `outcome text check in ('win','lose','inconclusive')`, `primary_kpi_result numeric`, `evidence jsonb`, `conclusion`, `learning`, `next_action`, `decided_at`, `decided_by` |

`experiment_variants` from v1.0 is **removed** — a single-operator MVP runs A/B, not multivariate; variant metadata lives in the two description fields plus `external_refs`.

**Lead & CRM mirror (Phase 5, synced in Phase 7)**

| Table | Key columns |
|---|---|
| `companies` | `hubspot_company_id text unique null`, `name`, `domain citext null`, `segment`, `industry`, `source_system`, `source_updated_at`, `synced_at` |
| `contacts` | `hubspot_contact_id text unique null`, `email citext null`, `phone_e164 text null`, `full_name`, `company_id fk null`, `lifecycle_stage text`, `lifecycle_stage_at timestamptz`, `hubspot_owner_id text null`, **first-touch block**: `ft_source, ft_medium, ft_campaign, ft_content, ft_term, ft_landing_page, ft_referrer, ft_at` (write-once), `synced_at`. Partial unique index on `email` and on `phone_e164` where not null. |
| `leads` | **one row per inquiry**, `contact_id fk`, `company_id fk null`, `inquiry_at timestamptz`, `inquiry_date date`, `channel text check in ('web_form','whatsapp','manual','import','referral','other')`, `platform text check in ('meta','google','linkedin','tiktok','organic','direct','referral','unknown')`, **last-touch block**: `lt_source, lt_medium, lt_campaign, lt_content, lt_term, landing_page, referrer`, `click_id_type text check in ('fbclid','gclid','ctwa_clid','li_fat_id','none')`, `click_id text null`, `campaign_id text null`, `adset_id text null`, `ad_id text null`, `product_interest`, `estimated_quantity int null`, `required_by_date date null`, `message text null`, `qualification_status text check in ('new','mql','sql','disqualified')`, `qualification_reason text`, `qualification_rule_version text`, `qualified_at`, `sql_at`, `disqualified_at`, `deal_id fk null`, `dedupe_key text unique`, `source_event_id fk null → webhook_events` |
| `lead_stage_events` | append-only: `lead_id fk`, `from_status`, `to_status`, `changed_at`, `source text check in ('pmos','hubspot','manual','import')`, `actor`, `note` |
| `deals` | `hubspot_deal_id text unique null`, `lead_id fk null`, `contact_id fk null`, `company_id fk null`, `name`, `pipeline`, `stage_key`, `stage_label`, `stage_category text check in ('open','won','lost')`, `amount numeric(18,2)`, `currency`, `expected_close_date`, `close_date`, `owner_hubspot_id`, `attributed_campaign text null`, `attribution_rule_version text null`, `source_updated_at`, `synced_at` |

> **AD-01 (binding).** `leads` is an **inquiry event**, not a person. A returning buyer produces a second `leads` row against the same `contacts` row. This is what makes per-campaign lead counts and CPL correct for a B2B business with repeat corporate buyers. v1.0's `unique(hubspot_contact_id)` on `leads` would have silently under-counted every repeat inquiry.

> **AD-02 (binding).** `lead_attributions` is **removed**. First touch is immutable on `contacts` (`ft_*`), last touch is per-inquiry on `leads` (`lt_*`). Multi-touch attribution is a Future item and will be added as an append-only `touchpoints` table when justified — not before.

**Integration plumbing (Phases 6–7)**

| Table | Key columns |
|---|---|
| `webhook_events` | `source`, `event_type`, `external_event_id null`, `idempotency_key text unique`, `signature_valid bool`, `payload jsonb`, `received_at`, `processed_at`, `status text check in ('received','processed','rejected','failed')`, `error`, `correlation_id` |
| `sync_state` | `integration`, `resource`, `cursor text null`, `last_run_at`, `last_success_at`, `consecutive_failures int default 0`, `last_error`, **unique(`integration`,`resource`)** |
| `integration_runs` | `integration`, `resource`, `trigger text check in ('schedule','webhook','manual')`, `started_at`, `ended_at`, `status text check in ('success','partial','failed')`, `records_read`, `records_written`, `records_failed`, `error_summary`, `correlation_id` |

`webhook_events.payload` retains raw input for replay and debugging. **Retention: 90 days**, then the payload column is nulled by a scheduled job while the event row is kept (NFR-G5 + storage discipline).

**Alerts (Phase 8)**

| Table | Key columns |
|---|---|
| `alerts` | `alert_key text` (deterministic dedupe key), `type`, `severity text check in ('info','warning','critical')`, `title`, `message`, `entity_type`, `entity_id uuid null`, `evidence jsonb`, `status text check in ('open','acknowledged','resolved','suppressed')`, `first_seen_at`, `last_seen_at`, `occurrence_count int default 1`, `last_notified_at`, `notification_count int default 0`, `acknowledged_at`, `resolved_at`, `resolved_reason`. **Partial unique index on `alert_key` where `status <> 'resolved'`** |

**Paid media (Phase 9)**

| Table | Key columns |
|---|---|
| `ad_accounts` | `platform text check in ('meta','google','linkedin','tiktok')`, `external_account_id`, `name`, `currency char(3)`, `timezone text`, `is_active`, **unique(`platform`,`external_account_id`)** |
| `ad_metrics_daily` | `ad_account_id fk`, `platform`, `metric_date date`, `campaign_id text`, `campaign_name`, `adset_id text not null default ''`, `adset_name`, `ad_id text not null default ''`, `ad_name`, `impressions bigint`, `clicks bigint`, `spend numeric(18,2)`, `currency`, `reach bigint null`, `frequency numeric null`, `platform_results int null`, `platform_result_type text null`, `source_timezone text`, `ingested_at`, **unique(`ad_account_id`,`metric_date`,`campaign_id`,`adset_id`,`ad_id`)** |

> **AD-03 (binding).** v1.0's `campaign_daily` is replaced by a **platform-agnostic** `ad_metrics_daily`. MVP writes campaign grain only (`adset_id`/`ad_id` = `''`); adding Google Ads or ad-level granularity later is an insert pattern change, not a migration of the fact table. `campaign_daily.leads` is deliberately **not** carried over: platform-reported lead counts and CRM lead counts are different facts and must never live in the same column.

**Decision engine & reporting (Phases 10–11)**

| Table | Key columns |
|---|---|
| `rule_evaluations` | `rule_key`, `rule_version`, `evaluated_at`, `window_start`, `window_end`, `scope_type text check in ('account','campaign','adset','ad','lead','experiment','integration')`, `scope_id text`, `verdict text check in ('MONITOR','INVESTIGATE','HOLD','SCALE_CANDIDATE','PAUSE_CANDIDATE','SUPPRESSED')`, `evidence jsonb`, `alert_id fk null` |
| `reports` | `type text check in ('weekly','monthly')`, `period_start date`, `period_end date`, `status text check in ('draft','final')`, `facts jsonb` (immutable snapshot), `narrative_md`, `version int`, `finalized_at`, `finalized_by`, **unique(`type`,`period_start`,`version`)** |

### 15.3 Derived views (not tables)

`funnel_daily` from v1.0 is **removed as a table** and replaced by views, so the funnel can never drift from the rows it summarises.

| View | Grain | Definition summary |
|---|---|---|
| `vw_funnel_daily` | `inquiry_date` × `platform` × `lt_campaign` | Cohort basis: a lead counts on the date it was **acquired**, and its MQL/SQL/won outcomes count on that same cohort date. Use for rate metrics (MQL rate, SQL rate, CPQL). |
| `vw_funnel_activity_daily` | event date | Snapshot basis: stage transitions counted on the date they occurred, from `lead_stage_events`. Use for "what happened this week" reporting. |
| `vw_lead_quality_by_campaign` | campaign × period | Leads, MQL, SQL, MQL rate, deals, won, revenue joined to `ad_metrics_daily` for CPL/CPQL/CPSQL. |
| `vw_attribution_coverage` | day | Share of leads with a resolvable campaign — feeds P4 suppression. |

> **AD-05 (binding).** Cohort vs activity is an explicit, named distinction. Any KPI displayed in the UI must state which basis it uses. Mixing them is the single most common way a funnel dashboard lies.

### 15.4 Index plan

```
contacts(hubspot_contact_id) unique;  contacts(email) unique where email is not null
contacts(phone_e164) unique where phone_e164 is not null;  contacts(company_id)
leads(dedupe_key) unique;  leads(contact_id);  leads(inquiry_date desc)
leads(qualification_status, inquiry_date desc);  leads(lt_campaign, inquiry_date)
leads(click_id) where click_id is not null;  leads(deal_id)
lead_stage_events(lead_id, changed_at desc)
deals(hubspot_deal_id) unique;  deals(stage_category, close_date);  deals(lead_id)
ad_metrics_daily(ad_account_id, metric_date, campaign_id, adset_id, ad_id) unique
ad_metrics_daily(metric_date desc);  ad_metrics_daily(campaign_id, metric_date)
alerts(alert_key) unique where status <> 'resolved';  alerts(status, severity, last_seen_at desc)
workflow_runs(template_id, run_date) unique;  workflow_items(run_id)
webhook_events(idempotency_key) unique;  webhook_events(source, received_at desc)
integration_runs(integration, started_at desc);  rule_evaluations(scope_type, scope_id, evaluated_at desc)
experiments(status, review_date);  reports(type, period_start desc)
```

### 15.5 Row Level Security

```sql
alter table <every_table> enable row level security;
```

MVP policy set (single-operator, all rows belong to the workspace):

| Table group | `select` | `insert`/`update`/`delete` |
|---|---|---|
| `profiles` | `auth.uid() = id` | `auth.uid() = id` |
| Operational (workflow*, notes, experiments*, playbook, reports) | `auth.role() = 'authenticated'` | `auth.role() = 'authenticated'` |
| Mirrors & analytics (contacts, leads, companies, deals, ad_*, views) | `auth.role() = 'authenticated'` | **service role only** (no anon/authenticated write policy) |
| Plumbing (webhook_events, sync_state, integration_runs, rule_evaluations) | `auth.role() = 'authenticated'` | **service role only** |

Rules:
- No policy may reference `anon`. Anonymous access is never granted, to any table.
- Manual lead entry and manual stage override are performed through **server functions using the service role**, after the server has verified the session — not through direct client writes. This keeps a single write path into mirrored data.
- A migration that creates a table without enabling RLS fails the phase gate.
- Phase 12 includes an automated RLS audit: assert every `public` table has `relrowsecurity = true` and at least one policy.

---

## 16. Data Ownership Matrix

| Data | Source of truth | Local copy | Sync direction | Write-back from PM OS |
|---|---|---|---|---|
| Contact identity, lifecycle stage | **HubSpot** | `contacts` | HubSpot → Supabase | Only at creation (ingest) and `pmos_lead_id` stamp |
| Company | **HubSpot** | `companies` | HubSpot → Supabase | Only at creation |
| Deal, stage, amount, owner, close date | **HubSpot** | `deals` | HubSpot → Supabase | **Never** |
| Inquiry event + attribution | **PM OS** | — | PM OS → HubSpot (first-touch properties, write-once) | Yes |
| MQL decision + reason | **PM OS** | — | PM OS → HubSpot (`pmos_mql_reason`, `pmos_qualified_at`) | Yes |
| SQL / opportunity decision | **HubSpot (sales)** | `leads.qualification_status` mirror | HubSpot → PM OS | Never (manual override in PM OS is allowed but recorded as `source='manual'` and does not push) |
| Spend, impressions, clicks | **Ad platform** | `ad_metrics_daily` | Platform → Supabase | Never |
| Website behaviour | **GA4** | `web_metrics_daily` (post-MVP) | GA4 → Supabase | Never |
| Workflow completion, notes | **PM OS** | — | internal | — |
| Experiments & learnings | **PM OS** | — | internal | — |
| Alerts & rule evaluations | **PM OS** | — | PM OS → Slack | — |
| Slack messages | **Slack** | `alerts.last_notified_at` only | PM OS → Slack | — |
| Reports | **PM OS** | — | internal, immutable once final | — |
| Secrets | **Vercel / n8n credential store** | never in DB | — | — |

**Conflict resolution.** Where both systems hold a value (lifecycle stage), HubSpot wins on every sync; PM OS only records that a divergence occurred, in `lead_stage_events` with `source='hubspot'`. A divergence rate above threshold raises a data-health alert instead of being silently overwritten forever.

---

## 17. Authentication & Authorization

- **Supabase Auth**, email + password with mandatory email confirmation, or magic link. Decide once in Phase 1 and record in `DECISIONS.md`.
- **Public sign-up is disabled** in the Supabase dashboard. Users are provisioned by the owner via invite. A `handle_new_user` trigger creates the matching `profiles` row. This is a security requirement, not a preference: an internal tool with open sign-up is an open database.
- Session handling with `@supabase/ssr` cookie helpers. Middleware protects the entire `(app)` route group; unauthenticated requests redirect to `/login?next=<path>`.
- **Authorization in MVP is binary** (authenticated or not). `profiles.role` exists and is read by a `can(action)` helper that returns `true` for `owner` on everything, so later role restrictions are a change in one function, not a scatter of conditionals.
- Service-role key is used **only** inside `lib/supabase/server-admin.ts`, which is guarded by an `import 'server-only'` directive so a client import fails the build.
- Machine callers never use Supabase Auth. They use HMAC (ingest) or `CRON_SECRET` (jobs).
---

## 18. Integration Architecture (general)

Every integration in PM OS obeys the same seven-step contract. A workflow that skips a step does not pass its phase gate.

```
Trigger → Authenticate → Validate (Zod) → Normalise → Persist (idempotent) → Log (integration_runs) → Handle failure (classify → retry or dead-letter → alert)
```

| Concern | Rule |
|---|---|
| Authentication | Inbound: HMAC-SHA256 over `timestamp + method + path + raw body`, constant-time compare, reject if `abs(now - timestamp) > 300 s` (replay window). Outbound: bearer token from server env / n8n credential store. |
| Validation | Every external payload is parsed by a Zod schema before any other code touches it. Unparsed payloads are stored raw in `webhook_events` with `status='rejected'` and never partially applied. |
| Idempotency | `Idempotency-Key` header required on ingest; natural-key upserts everywhere else. Replay returns the original outcome. |
| Partial failure | A batch that writes 40 of 50 rows is `status='partial'`, not `'success'`. `records_failed` is populated and the failures are individually recoverable. |
| Retry | Bounded exponential backoff, max 5 attempts, only for retryable error classes (§14.2). |
| Dead-letter | After retry exhaustion: mark `webhook_events.status='failed'`, raise a `CRITICAL` alert once (dedupe key includes the resource), stop. Never retry forever. |
| Manual recovery | Every integration exposes a manual "re-sync" action on `/integrations` with a date-range or record-id parameter. |
| Freshness SLA | Each integration declares an expected sync interval in `app_settings`. Exceeding it by 2× raises a data-health alert and suppresses optimisation verdicts for the affected scope (P4). |

---

## 19. HubSpot Architecture

### 19.1 Mapping layer (mandatory)

PM OS must **not** assume Du Anyam's HubSpot portal already has the conceptual funnel stages. The conceptual funnel, the HubSpot lifecycle stages, and the HubSpot deal pipeline stages are three different things.

A configurable mapping lives in `app_settings` under `hubspot.mapping` and is validated with Zod on read:

```jsonc
{
  "portal_id": "…",
  "pipeline_id": "…",
  "lifecycle_map": {                 // HubSpot lifecycle stage  →  PM OS status
    "lead": "new", "marketingqualifiedlead": "mql",
    "salesqualifiedlead": "sql", "customer": "sql", "other": "disqualified"
  },
  "deal_stage_map": {                // HubSpot deal stage id  →  stage_category
    "appointmentscheduled": "open", "qualifiedtobuy": "open",
    "presentationscheduled": "open", "contractsent": "open",
    "closedwon": "won", "closedlost": "lost"
  },
  "owner_map": { "<hubspot_owner_id>": "<display name>" },
  "properties": { "first_touch_source": "original_utm_source", "…": "…" }
}
```

An unmapped HubSpot stage is **not** guessed. It is stored raw in `deals.stage_key`, categorised as `open`, and raises a `WARNING` alert naming the unmapped value. Silent default-mapping is how funnel numbers become fiction.

### 19.2 Required HubSpot custom properties

Created manually in HubSpot before Phase 7 (see Appendix A — external preconditions). Internal names are fixed here so the mapping has something stable to bind to.

| Internal name | Object | Type | Purpose |
|---|---|---|---|
| `original_utm_source` / `_medium` / `_campaign` / `_content` / `_term` | Contact | single-line text | First-touch attribution, write-once |
| `original_landing_page` | Contact | single-line text | First landing page |
| `original_click_id` / `original_click_id_type` | Contact | single-line text | `fbclid` / `gclid` / `ctwa_clid` |
| `lead_product_interest` | Contact | dropdown | Product / category requested |
| `estimated_quantity` | Contact, Deal | number | Order size signal |
| `required_by_date` | Deal | date | Timeline requirement |
| `lead_quality_reason` | Contact | single-line text | Why MQL / why disqualified |
| `pmos_lead_id` | Contact, Deal | single-line text | Cross-system key back to `leads.id` |
| `pmos_qualified_at` | Contact | datetime | When PM OS set MQL |

### 19.3 Sync design

```
HubSpot ──webhook (contact.propertyChange, deal.propertyChange, deal.creation)──► n8n
                                                                                    │ relay + retry
                                    scheduled reconcile (every 30 min, cursor-based) │
                                                                                    ▼
                                          POST /api/ingest/hubspot  (HMAC + Idempotency-Key)
                                                                                    │
                          Zod validate → map (§19.1) → normalise → upsert contacts/companies/deals
                                     → write lead_stage_events on any status change
                                     → recompute affected funnel views (tag revalidation)
                                     → emit alert candidates (Phase 8)
                                     → write integration_runs + sync_state
```

**Dual-path by design.** Webhooks give latency; the scheduled reconcile gives completeness. Webhooks are best-effort and may be missed; the reconcile is the correctness guarantee. Reconcile is **cursor-based** on `hs_lastmodifieddate` stored in `sync_state.cursor`, with a 5-minute overlap window to survive clock skew, and is idempotent so overlap is harmless.

**Write-back is narrow and explicit.** PM OS writes to HubSpot only:
1. At ingest: create/update Contact (+ Company association) and set first-touch properties **only if empty**.
2. On qualification: `lead_quality_reason`, `pmos_qualified_at`, `pmos_lead_id`, and lifecycle stage → MQL **only if** `hubspot.write_lifecycle_stage` is enabled in settings (default: **disabled** until sales workflow is confirmed).
3. Nothing else. PM OS never writes deal stage, owner, or amount.

**Duplicate prevention.** Contact resolution order: `hubspot_contact_id` → normalised email → E.164 phone → `dedupe_key`. If two candidates match, the write is refused with `CONFLICT`, the event is parked, and a `WARNING` alert asks for a human decision. Automatic merging of CRM records is out of scope permanently.

### 19.4 CRM workflows (conceptual → implemented)

**Workflow A — new inbound lead**
1. Landing page / WhatsApp gateway captures identity, requirement, UTM parameters and click id.
2. Source posts to n8n; n8n relays to `POST /api/ingest/lead` with HMAC + `Idempotency-Key`.
3. PM OS validates, normalises phone to E.164 and email to lowercase, resolves or creates `contacts` + `companies`, inserts a `leads` row with `dedupe_key`.
4. PM OS runs the qualification engine (§26.3) and records status + reason + rule version + a `lead_stage_events` row.
5. PM OS upserts the HubSpot Contact and associates the Company; stores `hubspot_contact_id`.
6. If MQL → alert candidate `new_mql` (Phase 8) → Slack.
7. `integration_runs` row written with the correlation id received from n8n.

**Workflow B — MQL → SQL → Deal (sales-owned)**
1. Sales works the record **in HubSpot**. PM OS does not drive this.
2. HubSpot webhook or the 30-minute reconcile detects the lifecycle/deal change.
3. PM OS maps the stage, updates the mirror, appends `lead_stage_events` with `source='hubspot'`.
4. If a Deal appears, PM OS links it to the originating `leads` row via `pmos_lead_id`, falling back to contact association.
5. On `stage_category='won'`, revenue is attributed using the configured rule (§23.3) and `attribution_rule_version` is stamped on the deal.

**Workflow C — stale follow-up**
1. Scheduled job every workday 08:00 Asia/Jakarta.
2. Find `qualification_status in ('mql','sql')` with no `lead_stage_events` and no HubSpot activity for more than the SLA in settings (default MQL 2 workdays, SQL 3 workdays).
3. Create or refresh one alert per lead (`alert_key = 'stale_lead:'||lead_id`).
4. Slack receives a **single digest**, never one message per lead.
5. The alert auto-resolves when a newer stage event or HubSpot activity arrives.

> **Known organisational dependency.** Du Anyam has no dedicated Sales role; Closed Won/Lost field discipline is a shared responsibility. PM OS cannot fix this and must not pretend the data is complete when it is not. Therefore: `vw_attribution_coverage` and a "deals missing outcome" counter are first-class data-health signals, and revenue-based verdicts are suppressed when outcome completeness falls below the configured threshold.

---

## 20. Slack Architecture

Slack is an **outbound notification and coordination layer** in MVP. No interactive components, no slash commands, no Events API subscription.

### 20.1 Setup

Slack app in the Du Anyam workspace → Incoming Webhook → dedicated channel (`#pm-alerts`). Webhook URL stored as a credential in n8n and as `SLACK_WEBHOOK_URL` in the app server env. A separate `#pm-alerts-dev` channel and webhook is used by non-production environments — production alerts must never originate from a dev deploy.

### 20.2 Notification policy

| Event | Severity | Channel | Cadence |
|---|---|---|---|
| New MQL | INFO | Slack | Immediate, max 1 per lead |
| New SQL | INFO | Slack | Immediate |
| Deal won / lost | INFO | Slack | Immediate |
| Stale MQL/SQL past SLA | WARNING | Slack | Daily digest 08:00 |
| Spend recorded with zero leads > 24 h | CRITICAL | Slack | Immediate, dedupe per campaign per day |
| Tracking / attribution coverage below threshold | WARNING | Slack | Daily, once |
| Integration failure after retry exhaustion | CRITICAL | Slack | Immediate, dedupe per integration per day |
| Integration recovered | INFO | Slack | Once, on transition |
| Experiment review due | INFO | **In-app only** | Today page |
| Rule verdict MONITOR / INVESTIGATE | — | **In-app only** | Today page |
| Weekly report ready | INFO | Slack | Weekly |

**Anti-spam rules (binding):** (a) one Slack message per `alert_key` per day maximum; (b) any category exceeding 5 messages in an hour collapses into a digest; (c) `INFO` alerts are suppressed entirely outside 07:00–20:00 Asia/Jakarta and batched into the next morning digest; (d) `alerts.notification_count` is incremented on every send and is visible in the UI so notification pressure is measurable.

### 20.3 Message contract

Slack carries **identifiers and links, not PII** (NFR-G5). No contact name, email, phone, or message body.

```
🟡 [MQL] New qualified lead
Company:   {{company_name}}
Campaign:  {{campaign_name}}   ({{platform}})
Interest:  {{product_interest}} · qty ~{{estimated_quantity}}
Reason:    {{qualification_reason}}
→ PM OS: {{app_url}}/leads/{{lead_id}}   → HubSpot: {{hubspot_url}}
```

---

## 21. n8n Architecture

n8n is **transport and scheduling**. It contains no business logic, no KPI maths, and no qualification decisions (AD-04).

### 21.1 Workflow catalogue

| ID | Trigger | Input | Action | Failure handling |
|---|---|---|---|---|
| `WF-LEAD-RELAY` | Webhook (LP form, WA gateway) | raw lead payload | Sign + relay to `POST /api/ingest/lead` | Retry 5× backoff → dead-letter → `WF-ERROR` |
| `WF-HUBSPOT-WEBHOOK-RELAY` | HubSpot webhook | CRM change event | Verify HubSpot signature → relay to `/api/ingest/hubspot` | as above |
| `WF-HUBSPOT-RECONCILE` | Schedule, every 30 min | `sync_state.cursor` | Call `/api/cron/hubspot-reconcile` | Alert after 3 consecutive failures |
| `WF-META-DAILY-INGEST` | Schedule, 06:00 WIB | date range (yesterday + 3-day lookback) | Call `/api/cron/meta-ingest` | as above |
| `WF-STALE-LEAD-DIGEST` | Schedule, workdays 08:00 | — | Call `/api/cron/stale-leads` → Slack digest | as above |
| `WF-DATA-HEALTH` | Schedule, hourly | — | Call `/api/cron/data-health` | as above |
| `WF-DECISION-EVAL` | Schedule, 07:00 WIB | — | Call `/api/cron/evaluate-rules` | as above |
| `WF-WEEKLY-REPORT` | Schedule, Monday 07:30 + manual | ISO week | Call `/api/cron/weekly-report` → Slack link | as above |
| `WF-SLACK-SEND` | Sub-workflow, called by others | `{channel, blocks, alert_key}` | POST to Slack webhook | Log failure to PM OS; never silent |
| `WF-ERROR` | n8n Error Trigger | failed execution | POST to `/api/ingest/ops-event` → CRITICAL alert | — |

### 21.2 Conventions

- Every execution generates `correlation_id = <workflow>-<ISO timestamp>-<short uuid>` and passes it in the `X-Correlation-Id` header. PM OS stores it on `integration_runs` and `webhook_events`.
- Credentials live only in n8n's credential store. Exported workflow JSON committed to the repository must be scrubbed; a pre-commit check greps for `sk-`, `pat-`, `xoxb-`, `Bearer `, and `https://hooks.slack.com`.
- Node names must not contain tokens, phone numbers, or email addresses.
- Each workflow is small and single-purpose. Two workflows sharing 80% of their nodes indicates a missing sub-workflow, not a reason to merge them into one monolith.
- **Scheduled jobs call PM OS endpoints; they never write to Supabase directly.** This keeps validation, versioning, and logging in one place. The only exception permitted is a read-only query for digest assembly, and even that must be justified in `DECISIONS.md`.

---

## 22. Analytics Architecture (ad platforms, GA4, GTM)

### 22.1 Meta Ads (MVP connector, Phase 9)

- System User token with `ads_read` only, stored server-side, rotated per the platform's expiry policy; expiry date recorded in `app_settings` and surfaced as a `WARNING` alert 14 days before.
- Graph API version is **pinned** in `config/integrations.ts` with the date it was verified. Upgrading the version is a deliberate task with a `DECISIONS.md` entry, never an implicit follow of "latest".
- Daily pull at 06:00 WIB with a **3-day lookback** (attribution windows restate recent days) upserting into `ad_metrics_daily`.
- Store the ad account's own `timezone` and `currency` on `ad_accounts` and the `source_timezone` on every row. If the account timezone is not Asia/Jakarta, the discrepancy is displayed on `/integrations` rather than silently reconciled.
- Requested fields (campaign grain, MVP): `date_start`, `campaign_id`, `campaign_name`, `impressions`, `clicks`, `spend`, `reach`, `frequency`, and the account's primary result action + cost per result.

### 22.2 GA4 / GTM — post-MVP, with a precondition

GA4 and GTM are **not** in MVP. Website behaviour data does not change a daily decision until the landing-page and tracking foundation is verified. The precondition for building the connector is that GTM publishes a consistent `lead_submit` event with UTM and click-id parameters on all landing pages (Appendix A).

GTM/landing-page instrumentation is **external work**, not part of this application. What PM OS requires from it is a contract, defined in §23.2.

### 22.3 Other platforms

Google Ads, LinkedIn and TikTok connectors are Future. The schema is already platform-agnostic (AD-03), so adding one is: register the account in `ad_accounts`, implement an `integrations/<platform>/client.ts` conforming to the shared `AdMetricsProvider` interface, add an n8n schedule. No migration, no view rewrite.

---

## 23. Attribution Architecture

### 23.1 Model (MVP)

**First touch on the contact, last touch on the inquiry.** Nothing more. Multi-touch is a Future item and is not to be approximated with partial data.

| Field | Stored on | Mutability |
|---|---|---|
| `ft_source / ft_medium / ft_campaign / ft_content / ft_term / ft_landing_page / ft_referrer / ft_at` | `contacts` | Write-once. Never overwritten once non-null. |
| `lt_source / lt_medium / lt_campaign / lt_content / lt_term / landing_page / referrer` | `leads` | Set at inquiry, immutable afterwards |
| `click_id_type` + `click_id` | `leads` | `fbclid` · `gclid` · `ctwa_clid` · `li_fat_id` · `none` |
| `campaign_id / adset_id / ad_id` | `leads` | Populated when the source provides them or when resolvable from the click id |

### 23.2 Inbound contract (what landing pages and gateways must send)

```jsonc
{
  "source_channel": "web_form | whatsapp | manual",
  "occurred_at": "2026-09-11T03:12:44Z",
  "contact":  { "full_name": "…", "email": "…", "phone": "…" },
  "company":  { "name": "…", "domain": "…" },
  "inquiry":  { "product_interest": "…", "estimated_quantity": 500,
                "required_by_date": "2026-11-01", "message": "…" },
  "attribution": {
    "utm_source": "…", "utm_medium": "…", "utm_campaign": "…",
    "utm_content": "…", "utm_term": "…",
    "landing_page": "/lp/corporate-gift", "referrer": "…",
    "click_id_type": "ctwa_clid", "click_id": "…",
    "campaign_id": "…", "adset_id": "…", "ad_id": "…"
  }
}
```

Every field except `source_channel` and `occurred_at` is optional. **A lead with no attribution is still a lead** — it is stored with `platform='unknown'` and flagged, never rejected. Rejecting unattributed leads would delete the very evidence that tracking is broken.

### 23.3 Revenue attribution rule

Configurable in `app_settings.attribution.revenue_rule`, default **`lead_last_touch`**: a won deal's revenue is credited to the `lt_campaign` of the `leads` row that created it. Alternatives (`contact_first_touch`, `split_50_50`) are selectable but changing the rule stamps a new `attribution_rule_version` and does **not** retroactively rewrite historical deals — historical reports must remain reproducible.

### 23.4 Click-to-WhatsApp (CTWA)

CTWA is an active acquisition channel and is treated as a first-class lead source in the ingest contract from Phase 6. However, whether `ctwa_clid` is actually obtainable depends on the WhatsApp API configuration (Cloud API vs BSP), which is an **external precondition outside this application's control** (Appendix A).

The design therefore has two modes, both supported from day one:
- **Deterministic**: gateway forwards `ctwa_clid` + `referral.source_id` (ad id) → `leads.click_id_type='ctwa_clid'`, `ad_id` populated, `platform='meta'`.
- **Degraded**: no click id available → lead is ingested with `platform='unknown'` and `channel='whatsapp'`, counted in volume, **excluded from campaign-level CPQL**, and counted in the attribution-coverage gap metric.

The degraded mode must never be quietly folded into campaign performance. An unattributed WhatsApp lead is not a Meta lead.

### 23.5 Naming conventions as data

Campaign and ad naming conventions are enforced upstream and parsed downstream. The convention in use:

```
Campaign : {Produk} - Fase{1-5} - {Bulan}          e.g.  Gift Anyaman - Fase1 - Sep
Ad Set   : T{n} - {topik singkat}                  e.g.  T2 - Gifting Korporat
Ad       : T{n}-{ANGLE}-H{n}-{FORMAT}-{VISUAL}     e.g.  T2-PAIN-H3-VID-DEMO
```

`domain/attribution/naming.ts` parses these into structured dimensions (`topic`, `angle`, `hook`, `format`, `visual`). A name that does not parse is **not** an error — it yields `null` dimensions and increments a naming-compliance metric surfaced on `/integrations`. Creative-dimension analysis itself is Future; capturing parseability now costs nothing and makes it possible later.

---

## 24. Performance Marketing Metrics

### 24.1 Formula layer

All formulas live in `domain/metrics/formulas.ts` and are implemented **exactly once**. No component, SQL view, report template, or n8n node may recompute a metric independently. Every formula returns `null` — never `0`, never `Infinity` — when its denominator is zero or an input is missing, and the UI renders `null` as `—` with a "no data" tooltip.

| Tier | Metric | Formula | Purpose |
|---|---|---|---|
| Diagnostic | CPM | `spend / impressions × 1000` | Auction cost signal |
| Diagnostic | CTR | `clicks / impressions` | Creative resonance |
| Diagnostic | CPC | `spend / clicks` | Traffic cost |
| Diagnostic | Frequency | platform-reported | Fatigue signal |
| Volume | Leads | count of `leads` in scope | — |
| Volume | CPL | `spend / leads` | **Diagnostic only — never an optimisation target** |
| Quality | MQL | count where `qualification_status in ('mql','sql')` | — |
| Quality | MQL Rate | `MQL / Leads` | Lead quality |
| Quality | **CPQL** | `spend / MQL` | **Primary optimisation metric** |
| Quality | SQL | count where `qualification_status = 'sql'` | — |
| Quality | SQL Rate | `SQL / MQL` | Sales acceptance |
| Quality | CPSQL | `spend / SQL` | — |
| Pipeline | Opportunities | count of `deals` with `stage_category='open'` or better | — |
| Pipeline | Quotation Rate | `quotations / SQL` (stage-mapped) | — |
| Pipeline | Win Rate | `won / (won + lost)` | — |
| Business | Revenue | `sum(deals.amount)` where `won` | — |
| Business | CAC | `spend / customers_won` | — |
| Business | ROAS | `attributed_revenue / spend` | — |
| Health | Attribution coverage | `leads with resolvable campaign / leads` | Gate for P4 |
| Health | Outcome completeness | `deals with won|lost / deals past expected close` | Gate for revenue verdicts |

### 24.2 Metric semantics (must be stated wherever a metric is displayed)

1. **Basis**: cohort (`vw_funnel_daily`) or activity (`vw_funnel_activity_daily`). Mixing is forbidden.
2. **Scope**: account / platform / campaign / adset / ad.
3. **Window**: the date range, in Asia/Jakarta, and whether the lookback restatement window is included.
4. **Freshness**: the `synced_at` of the oldest contributing source.
5. **Confidence**: sample size. Below the configured minimum (`metrics.min_results_for_verdict`, default 10 conversions per unit, or fewer than 3 complete days) the metric is shown but marked *insufficient sample* and **cannot** drive a SCALE or PAUSE verdict.

### 24.3 B2B adaptation of the e-commerce framework

The house Meta Ads framework (V3) is purchase-optimised: CPR = cost per purchase. In Du Anyam's B2B funnel the equivalent unit is not a purchase but a **qualified lead**. The translation used throughout PM OS:

| Framework concept | PM OS equivalent |
|---|---|
| CPR (cost per result / purchase) | **CPQL** (cost per MQL) |
| Breakeven CPR = price × margin | Target CPQL = (average deal value × margin) × (MQL→won rate) |
| Kill rule: 0 purchases after spend ≥ 3× target CPR | Kill candidate: 0 MQL after spend ≥ 3× target CPQL |
| Minimum 3 full days before concluding | Same, plus B2B lag: MQL→SQL latency is added to the evaluation window |
| Don't conclude below ~50 results per cell | `metrics.min_results_for_verdict` |

**B2B lag is explicit.** A lead generated today may become an SQL next week and a won deal next quarter. Any campaign-level quality verdict must therefore compare cohorts old enough to have matured (`metrics.cohort_maturity_days`, default 14). Judging this week's cohort on this week's SQL rate is a measurement error, not an insight.

---

## 25. Daily Workflow System

### 25.1 Purpose

`/today` answers one question: **what should I work on today?** It is not an analytics dashboard. If a section does not change what the user does in the next hour, it does not belong on this page.

### 25.2 Sections (progressive — each appears only when its data source exists)

| Section | Content | Available from |
|---|---|---|
| Header | Greeting, date, ISO week, environment badge | Phase 2 |
| Daily Checklist | Today's workflow run, weekday-aware | Phase 2 |
| Quick Notes | Free-text note, auto-tagged to the date, feeds the weekly report | Phase 2 |
| Experiment Review Queue | Experiments whose `review_date <= today` and are `running` | Phase 4 |
| Lead Follow-up Queue | MQL/SQL past SLA, or leads with missing attribution | Phase 5 |
| Data Health Strip | Per-integration status + last successful sync | Phase 7 |
| Alerts | Open alerts, grouped by severity | Phase 8 |
| Priority Actions | Top 3–5 ranked recommendations with evidence | Phase 10 |

A section with no data renders its empty state with the action that would fill it. It never renders a spinner indefinitely or disappears silently.

### 25.3 Checklist engine

- Templates define ordered steps; `cadence` plus `weekdays` decide which run on a given date.
- A run is materialised lazily on first view of the day (no cron needed for MVP) and is idempotent via `unique(template_id, run_date)`.
- Completing a step writes `completed_at`; steps can carry notes.
- A missed day is not backfilled and not deleted — the absence of a run is itself information for the weekly report.
- Seed templates shipped in Phase 2: **Daily Ops** (check spend pacing, review new leads, check stale MQL, check data health, log one note), **Weekly Review** (Monday), **Monthly Review**.

---

## 26. Lead & Funnel System

### 26.1 Conceptual funnel vs system state

```
Visitor → Inquiry (leads row) → MQL → SQL → Opportunity/Deal → Quotation → Negotiation → Won/Lost
          [PM OS owns]          [PM OS]  [HubSpot owns from here on]
```

PM OS decides MQL. **Everything from SQL onward is decided by sales in HubSpot** and mirrored. This boundary is what prevents two competing definitions of the pipeline.

### 26.2 Lead entry paths (all three exist from Phase 5)

1. **Manual form** in `/leads/new` — the path that makes the system usable before any integration exists.
2. **CSV import** with a mapping step and a dry-run preview — the path that loads history from a HubSpot export without hand typing.
3. **Signed API ingest** (Phase 6) — the automated path.

All three converge on the same service function, the same validation, the same qualification engine, and the same `lead_stage_events`. There is exactly one write path into `leads`.

### 26.3 Qualification engine (v1 rules, `qualification_rule_version = 'q1'`)

Deterministic, ordered, fully unit-tested. Thresholds live in `app_settings.qualification`.

**Disqualify (first match wins, status `disqualified`):**
| Code | Condition |
|---|---|
| `DQ_NO_CONTACT` | No valid email and no valid E.164 phone |
| `DQ_TEST` | Matches test patterns (`test`, `asdf`, internal domains) |
| `DQ_NONCOMMERCIAL` | Message matches research/student keywords (`skripsi`, `tugas`, `penelitian`, `magang`) |
| `DQ_COMPETITOR` | Company domain on the competitor list in settings |
| `DQ_OUT_OF_SCOPE` | Explicit request outside the product catalogue |

**Qualify as MQL (all must hold):**
| Code | Condition |
|---|---|
| `Q_CONTACTABLE` | Valid email **or** valid phone |
| `Q_BUSINESS` | Company name present **or** email domain is not on the free-provider list |
| `Q_INTENT` | `product_interest` present **or** message length ≥ 20 characters |
| `Q_SIZE` | `estimated_quantity >= qualification.min_quantity` (default 50) **or** `required_by_date` present **or** `estimated_quantity` unknown and `Q_BUSINESS` holds |

**Otherwise:** status `new` — a real lead awaiting human review, surfaced in the Today follow-up queue. `new` is not a failure state; an ambiguous lead that a human resolves in 30 seconds is better than a wrong automatic verdict.

Every decision writes `qualification_reason` (the matched codes) and `qualification_rule_version`. Changing rules means bumping the version, not editing history: past leads keep the verdict they were given under the rules of their time, and the UI can show both.

**Manual override** is always allowed, requires a reason, writes `lead_stage_events` with `source='manual'`, and never silently re-runs the engine over it.

### 26.4 Funnel surfaces

- `/funnel` — cohort funnel with stage-to-stage conversion, absolute counts and rates, plus a visible "cohort maturity" note.
- `/leads` — filterable registry (stage, source, platform, campaign, owner, date, attribution completeness), server-paginated.
- `/leads/[id]` — identity, company, requirement, attribution block, full `lead_stage_events` timeline, linked deal, deep link to HubSpot.
- Flags shown inline: missing attribution, stale status, unmapped HubSpot stage, duplicate-suspect.

---

## 27. Experiment System

Every material optimisation is recordable in under 60 seconds, or it will not be recorded at all. The form is deliberately short.

**Lifecycle:** `draft → running → completed` (or `cancelled` from any state).

**Required at creation:** title, hypothesis, variable, primary KPI, start date, review date.
**Required at completion:** outcome, primary KPI result, conclusion, learning, next action. A `running` experiment cannot be moved to `completed` with an empty `learning` field — that field is the entire point of the module.

**Guardrails, not statistics.** MVP does not compute significance. It does two cheap things that prevent most bad conclusions:
1. Warns when the review date is less than `experiments.min_duration_days` (default 3) after start.
2. Warns when the observed result count is below `metrics.min_results_for_verdict` and labels the outcome *inconclusive by default*.

**Linkage.** `external_refs` holds campaign/adset/ad ids and landing-page URLs so a completed experiment can later be laid over the metric timeline. Building that overlay is Phase 10 or later; storing the refs is free now.

**Learning library.** Completed experiments are searchable by variable, KPI, outcome and free text. This is the institutional memory that survives staff turnover.

---

## 28. Playbook System

Structured operational knowledge, not an article CMS.

| Type | Shape | Example |
|---|---|---|
| `sop` | Prerequisites → numbered steps → expected output → failure cases → references | "Launch a new Meta campaign" |
| `checklist` | Checkable items, optionally instantiable as a workflow run | "Pre-launch tracking QA" |
| `decision_tree` | Condition → branch → action | "CPL rose — what now?" |
| `troubleshooting` | Symptom → likely causes → checks → fix | "Leads stopped arriving" |
| `reference` | Definitions, conventions, thresholds | "UTM & campaign naming convention" |

Requirements: markdown body with a constrained toolbar, full-text search across title/summary/body/tags, category and tag filtering, `draft`/`published`/`archived` status, and deep-linkable slugs so an alert can point at the exact procedure.

Seed content shipped in Phase 3 (five articles minimum): campaign launch SOP, tracking QA checklist, weekly review checklist, "CPL up — diagnostic tree", UTM & naming convention reference.

Automatic playbook retrieval from an alert type is **Future**. The manual link from alert → article is Phase 8 and costs nothing.

---

## 29. Decision Engine

### 29.1 Design

Rule-based, versioned, evidence-carrying, and **advisory only**. No rule may change anything in an ad platform. Every evaluation writes a `rule_evaluations` row whether or not it produces an alert, so "why did the system stay silent?" is answerable.

**Verdict vocabulary:** `MONITOR` · `INVESTIGATE` · `HOLD` · `SCALE_CANDIDATE` · `PAUSE_CANDIDATE` · `SUPPRESSED`.

Every recommendation surfaced to the user carries: detected condition · evidence (the actual numbers and window) · comparison basis · verdict · confidence and limitations.

### 29.2 Rule set v1 (`rule_version = 'r1'`)

Evaluated daily at 07:00 WIB over a rolling 7-day window with a 14-day comparison, per campaign unless stated.

| ID | Condition | Verdict | Note |
|---|---|---|---|
| `R-00` | Any contributing source stale beyond 2× its SLA, **or** attribution coverage < `health.min_coverage` (default 0.7) | `SUPPRESSED` | Gate rule. Runs first. When it fires, all other campaign-scoped rules return `SUPPRESSED` and the recommended action is *fix measurement*. |
| `R-01` | Sample below `metrics.min_results_for_verdict` or fewer than 3 complete days | `MONITOR` | Blocks SCALE and PAUSE. Never blocks INVESTIGATE. |
| `R-02` | Spend ≥ 3 × target CPQL in window with **0 MQL** | `PAUSE_CANDIDATE` | Direct B2B translation of the framework kill rule |
| `R-03` | CPL up ≥ 20% **and** CPQL down ≥ 10% | `HOLD` | Quality improved; cost per lead is the wrong alarm |
| `R-04` | CPL down **and** MQL rate down ≥ 25% **and** CPQL up | `INVESTIGATE` | Cheap junk leads — the most expensive illusion in lead gen |
| `R-05` | CPQL ≤ target **and** MQL volume ≥ minimum **and** stable ≥ 7 days | `SCALE_CANDIDATE` | Recommends a budget step, does not apply it |
| `R-06` | Spend > 0 but zero leads recorded in CRM for > 24 h on a lead-gen campaign | `INVESTIGATE` (CRITICAL alert) | Tracking failure suspicion, not a performance verdict |
| `R-07` | MQL/SQL without CRM update past SLA | `INVESTIGATE` | Process alert, not a campaign verdict |
| `R-08` | Experiment `review_date` reached while `running` | `MONITOR` | Feeds the review queue |
| `R-09` | Outcome completeness < `health.min_outcome_completeness` (default 0.6) | `SUPPRESSED` for revenue/ROAS/CAC verdicts only | Prevents ROAS theatre when Closed Won/Lost is not being filled in |
| `R-10` | Frequency > threshold with CTR down ≥ 25% vs prior window | `INVESTIGATE` | Creative fatigue signal |

### 29.3 Priority scoring for `/today`

```
score = severity_weight × recency_weight × impact_weight × (1 - snooze_penalty)
```
- `severity_weight`: critical 3, warning 2, info 1.
- `impact_weight`: proportional to the spend or pipeline value in scope, normalised 0–1.
- `recency_weight`: decays over 7 days so nothing sits at the top forever.
- Maximum 5 items. Ties broken by scope spend, descending.
- Any item can be snoozed (with a duration) or dismissed (with a reason). Both are recorded. An item a user dismisses three times is a rule that needs changing, and the system should make that visible.

**Explicitly out of scope in every phase of this document:** automatic campaign modification, automatic budget change, AI-generated recommendations.

---

## 30. Reporting

### 30.1 Weekly report structure

1. Executive summary (3–5 sentences)
2. Performance table: spend, leads, CPL, MQL, CPQL, SQL, CPSQL, opportunities, revenue — with previous-week comparison
3. What changed
4. Why it likely changed — **facts and interpretation visually separated**
5. Experiments: completed (with learning), running
6. Lead quality and sales follow-up observations
7. Next week's priorities
8. Data-quality caveats — **mandatory section, never omitted even when everything is healthy**

### 30.2 Generation flow

```
aggregate metrics (domain/metrics) → collect experiments, workflow completions, notes, alerts
  → assemble facts JSON → render editable draft → human edits narrative
  → finalize → snapshot facts + narrative, version++, immutable
  → export Markdown / print-to-PDF → Slack link
```

The `facts` JSON is frozen at finalisation. Re-running a past week later must reproduce the same report, even if the underlying rows have since been restated. Regenerating creates `version + 1`; it never mutates a finalised row.

AI-drafted narrative is Future. The structured facts are designed so that adding it later requires no schema change.

**Audience note:** the weekly report is read by the VP Marketing. The export must be presentable without editing — headings, a metric table, and no internal debug fields.

---

## 31. Observability & Data Health

### 31.1 Integration health model

Per integration, computed from `sync_state` + `integration_runs`:

| Status | Definition |
|---|---|
| `HEALTHY` | Last successful sync within SLA, `consecutive_failures = 0` |
| `DEGRADED` | Last success within 2× SLA, or last run `partial`, or `consecutive_failures` between 1 and 2 |
| `FAILING` | No success beyond 2× SLA, or `consecutive_failures ≥ 3` |
| `NOT_CONFIGURED` | Credentials absent — a legitimate, non-alarming state in early phases |

`/integrations` shows for each: status, last run, last success, records read/written/failed, last error (redacted), retry count, a manual re-sync control, and a link to the most recent `integration_runs` rows.

### 31.2 Data-health checks (hourly)

Freshness per source · attribution coverage · outcome completeness · unmapped HubSpot stages · duplicate-suspect contacts · leads with spend but no campaign match · currency mismatch across an aggregate · naming-convention compliance rate.

Each check that fails raises or refreshes a deduped alert. **Silence must mean healthy, not unmonitored**: if a check itself has not run within its own window, that absence raises an alert too.

### 31.3 Application observability

- Structured server logs (JSON) with `correlation_id`, route, duration, outcome — never PII, never tokens.
- `GET /api/health` returns `{status, version, commit, db: ok|fail}` and nothing else.
- Client error boundary logs component stack to the server; no third-party error tracker in MVP (add one only with a `DECISIONS.md` entry covering PII scrubbing).

---

## 32. Security

| Area | Requirement |
|---|---|
| Auth | Sign-up disabled; invite-only provisioning; email confirmation required; session cookies `httpOnly`, `secure`, `sameSite=lax` |
| Authorization | Every `(app)` route protected by middleware; every server function re-checks the session (never trusts the client); RLS as the final backstop |
| RLS | Enabled on 100% of `public` tables; no `anon` policy anywhere; mirrors writable only by service role |
| Secrets | Server-only env; `import 'server-only'` on the admin Supabase client; `.env.example` holds names only; no secret in any migration, seed, test fixture, or committed n8n export |
| Webhooks | HMAC-SHA256, constant-time compare, 300 s replay window, `Idempotency-Key` required, request body size cap (256 KB), content-type allowlist |
| Cron endpoints | `CRON_SECRET` bearer token, distinct from every other secret, rotated on any suspected exposure |
| PII | Minimise: store only what a decision requires. Never log name/email/phone/message. Slack carries identifiers only. Right-to-deletion path: delete `contacts` + `leads` rows by contact id, retaining aggregated counts. |
| Data retention | `webhook_events.payload` nulled after 90 days; `integration_runs` kept 12 months; lead data retained while commercially relevant, reviewed annually |
| Transport | HTTPS everywhere including the n8n VPS; HSTS on the app domain |
| n8n host | Firewalled to required ports, authentication enabled, automatic security updates, encrypted credential store, regular backups, no public workflow editor exposure |
| Dependencies | `npm audit` in CI; no new dependency without justification |
| Least privilege | HubSpot private app scoped to the minimum CRM read/write objects actually used; Meta token `ads_read` only |
| Backups | Supabase automated backups verified by an actual restore drill in Phase 12 — an unverified backup is a hypothesis, not a backup |

**Threat cases that must be explicitly tested (Phase 12):** forged ingest signature · replayed ingest payload · anon client attempting to read `leads` · service-role key present in the client bundle · secret appearing in an n8n export · malformed HubSpot webhook · oversized payload.

---

## 33. Testing Strategy

| Layer | Tool | Scope | Bar |
|---|---|---|---|
| Unit | Vitest | `domain/**` — formulas, qualification, rules, date helpers, naming parser, attribution resolution | **100% of `domain/` branches for metrics, qualification and rules**. These are the parts that are wrong silently. |
| Schema/contract | Vitest + Zod | Every external payload schema, including malformed and hostile inputs | Every schema has at least one accept and one reject test |
| Repository/integration | Vitest against a local Supabase or a test schema | Upserts, idempotency, RLS behaviour, view correctness against seeded fixtures | Replay test mandatory per integration |
| Integration (external) | Vitest with recorded fixtures; no live API calls in CI | HubSpot mapping, Meta response parsing, Slack payload shape | Fixtures committed, refreshed deliberately |
| E2E | Playwright | Login → Today → create lead → qualify → create experiment → complete → generate report | Runs before every deploy |
| Failure | Playwright + mocks | Integration down, stale data, empty states, expired session, permission denied | Each must render a usable page |
| Security | Script + manual checklist | The threat cases in §32 | All must pass at the Phase 12 gate |

**Test naming:** `TEST-<phase>.<n>` matching the requirement it verifies, so the traceability matrix is mechanically checkable.

**What is deliberately not tested:** pixel-level UI, third-party library internals, and anything that would require live production credentials in CI.

---

## 34. Development Standards

1. TypeScript `strict`. `any` requires an adjacent `// why:` comment; `unknown` + a type guard is the default alternative.
2. No business logic in React components. If a component computes a rate, it is misplaced.
3. Supabase is touched only in `repositories/`. External APIs only in `integrations/`.
4. All external data passes a Zod schema at the boundary. Database rows are typed from generated types, not hand-written interfaces.
5. Schema changes only through committed, forward-only migration files. Never edit an applied migration; add a new one.
6. Every migration enables RLS and adds the required indexes in the same file as the table it creates.
7. Naming: tables and columns `snake_case`, TypeScript `camelCase`, React components `PascalCase`, route segments `kebab-case`, settings keys `dot.notation`.
8. Commits are small and scoped to one phase. Commit message prefix: `phase-<n>: <area>: <change>`.
9. `npm run lint && npm run typecheck && npm test && npm run build` must pass before any task is declared complete. CI enforces the same four.
10. A new dependency, a new table, or a new abstraction requires a `DECISIONS.md` entry: problem, options considered, choice, cost.
11. Errors surface as the taxonomy in §14.2 — never a raw upstream error string in the UI.
12. Dead code, commented-out code, and unused feature flags are deleted, not parked.
---

## 35. Development Phases

### 35.0 Phase sequencing and why it differs from the naive order

Thirteen phases (0–12). Three deviations from the obvious ordering, each deliberate:

1. **n8n foundation sits at Phase 6, before HubSpot (7), not at the end.** HubSpot sync, Slack delivery, Meta ingest and every scheduled job depend on n8n. A standalone "automation phase" after everything else would either be empty or force those earlier phases to build throwaway schedulers.
2. **Lead & funnel (5) comes before HubSpot (7).** The data model, qualification engine and UI must be correct and manually usable before a sync can be judged correct. Syncing into an unproven schema is how a migration becomes a rewrite.
3. **Alerts (8) are separated from Slack delivery mechanics.** Alerts are a domain concept with dedupe, severity and lifecycle; Slack is one transport. Building them together produces a Slack-shaped alert model that cannot later be shown in-app.

Phases 0–8 constitute the MVP. Phases 9–12 constitute Phase-2 scope. Phases 2–5 are usable in daily work with zero integrations — that is the point.

| Phase | Name | Depends on | Delivers daily value? |
|---|---|---|---|
| 0 | Project Foundation | — | No (enabler) |
| 1 | Auth & Application Shell | 0 | No (enabler) |
| 2 | Daily Workflow OS | 1 | **Yes** |
| 3 | Playbook & SOP | 1 | **Yes** |
| 4 | Experiment OS | 1 | **Yes** |
| 5 | Lead & Funnel Core | 1 | **Yes** |
| 6 | Ingest API & n8n Foundation | 5 | Yes (automation) |
| 7 | HubSpot Integration | 5, 6 | **Yes** |
| 8 | Alerts & Slack | 5, 6 | **Yes** |
| 9 | Paid Media Data & Performance | 5, 6 | **Yes** |
| 10 | Decision Engine & Today v2 | 5, 8, 9 | **Yes** |
| 11 | Reporting | 2, 4, 5, 9, 10 | **Yes** |
| 12 | Observability, Hardening, Production | all | Enabler |

---

## Phase 0 — Project Foundation & Architecture

**Overview.** Repository, toolchain, control documents, environment validation, CI. No product features.

**Objective.** Make every later phase mechanically verifiable: one command runs lint, typecheck, tests and build, and a missing environment variable fails loudly at startup instead of at 2 a.m. in production.

**User value.** None directly. This phase exists so that the other twelve are cheap.

**Scope.** Next.js + TypeScript scaffold · Tailwind + shadcn/ui · ESLint/Prettier · Vitest + Playwright configured (no tests yet beyond a smoke test) · Zod-validated env module · folder structure per §12 · control documents · GitHub Actions CI · `.env.example`.

**Out of scope.** Supabase project, any table, any page beyond a placeholder, any integration, any auth.

**Dependencies.** None.

### Functional requirements

| ID | Requirement |
|---|---|
| FR-0.1 | The repository builds and serves a placeholder page with `npm run dev` and `npm run build`. |
| FR-0.2 | `lib/env.ts` parses `process.env` with Zod at module load; a missing or malformed required variable throws with the variable name before any request is served. |
| FR-0.3 | Server-only variables are inaccessible from client code; importing `lib/env.server.ts` from a client component fails the build. |
| FR-0.4 | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all exist and exit 0. |
| FR-0.5 | CI runs those four commands on every push and pull request and blocks merge on failure. |
| FR-0.6 | Control documents exist and are non-empty: `PRD.md` (this document), `ARCHITECTURE.md`, `DATA_MODEL.md`, `INTEGRATIONS.md`, `AGENTS.md`, `TASKS.md`, `DECISIONS.md`, `.env.example`. |

**Non-functional.** NFR-0.1 Node version pinned in `.nvmrc` and `engines`. NFR-0.2 Dependency count at the end of this phase is recorded in `DECISIONS.md` as the baseline.

**Tools.** Next.js, TypeScript, Tailwind, shadcn/ui, ESLint, Prettier, Vitest, Playwright, Zod, GitHub Actions.

**Data model.** None.

**Tasks.**
- BE-0.1 Scaffold Next.js App Router project with strict TypeScript.
- BE-0.2 Implement `lib/env.ts` (public) and `lib/env.server.ts` (server-only, with `import 'server-only'`).
- BE-0.3 Create the folder structure of §12 with `.gitkeep` and a one-line README per layer explaining what may and may not live there.
- BE-0.4 Configure Vitest (unit + node environment) and Playwright (one smoke test).
- FE-0.1 Install and configure Tailwind + shadcn/ui; define design tokens (colour, spacing, radius) and the four status semantics as reusable classes.
- FE-0.2 Placeholder root page rendering app name and build commit.
- INT-0.1 GitHub Actions workflow: install → lint → typecheck → test → build.
- BE-0.5 Author `AGENTS.md` from §39 of this document.

**Routes.** `/` placeholder only.

**User flow.** Developer clones, copies `.env.example`, runs `npm run dev`, sees the placeholder.

**Edge cases.** Missing `.env` → explicit error naming the variable. Node version mismatch → CI fails with a clear message.

**Error handling.** Startup validation errors are fatal and descriptive. No silent defaults for required variables.

**Security.** `.env*` in `.gitignore` except `.env.example`. No secret in the repository. Secret-scanning pre-commit hook (grep for `sk-`, `xoxb-`, `pat-`, `Bearer `, `hooks.slack.com`).

**Testing checklist.** `TEST-0.1` env parser rejects missing required var · `TEST-0.2` env parser accepts a valid set · `TEST-0.3` Playwright smoke loads `/` · `TEST-0.4` CI pipeline green on a clean clone.

**Acceptance criteria.**
- [ ] `npm run dev` serves the placeholder without warnings
- [ ] All four verification commands exit 0 locally and in CI
- [ ] Removing a required env var produces a named, fatal error
- [ ] All eight control documents exist and are non-empty
- [ ] No secret is present anywhere in the repository history

**Definition of done.** CI is green on `main`, the folder structure matches §12, and `TASKS.md` lists Phase 1 as next with no Phase 0 items open.

**Deliverables.** Repository, CI workflow, env modules, control documents, design tokens.

**Codex implementation order.** 1) scaffold → 2) lint/format → 3) env modules + tests → 4) folder structure + layer READMEs → 5) Tailwind/shadcn tokens → 6) test runners → 7) CI → 8) control documents.

---

## Phase 1 — Authentication & Application Shell

**Overview.** Supabase project, `profiles`, `app_settings`, RLS baseline, login/logout, protected layout, navigation shell.

**Objective.** A logged-in surface that every later feature can be dropped into, with the security posture correct from the first table rather than retrofitted.

**User value.** The user can log in and see the application skeleton. Nothing operational yet.

**Scope.** Supabase project (dev + prod) · auth with sign-up disabled · `profiles` + trigger · `app_settings` · RLS on both · middleware route protection · sidebar/topbar shell · all routes present as empty states · settings page reading/writing `app_settings` · first deployment.

**Out of scope.** Any domain table, any integration, roles beyond `owner`, password reset flows beyond Supabase defaults.

**Dependencies.** Phase 0.

### Functional requirements

| ID | Requirement |
|---|---|
| FR-1.1 | A user can sign in with the configured method and is redirected to `/today`. |
| FR-1.2 | An unauthenticated request to any `(app)` route redirects to `/login?next=<path>` and returns there after login. |
| FR-1.3 | Public sign-up is disabled; attempting to self-register fails. |
| FR-1.4 | A new `auth.users` row automatically creates a matching `profiles` row via trigger. |
| FR-1.5 | Sign-out clears the session and subsequent protected requests redirect to login. |
| FR-1.6 | The shell renders sidebar navigation for all eleven routes, with the current route indicated. |
| FR-1.7 | Every route renders a named empty state describing what will live there and which phase delivers it. |
| FR-1.8 | `/settings` reads and writes `app_settings` keys with Zod validation and records `updated_by` and `updated_at`. |
| FR-1.9 | RLS is enabled on `profiles` and `app_settings`; a user can read only their own profile. |
| FR-1.10 | The topbar displays an environment badge (`DEV`/`PROD`) sourced from env, so a production action is never taken in a dev tab by mistake. |

**Non-functional.** NFR-1.1 Session verified server-side on every protected request; the client is never trusted. NFR-1.2 Login page is keyboard-navigable with labelled fields. NFR-1.3 Auth failures return a generic message (no user enumeration).

**Tools.** Supabase (Postgres, Auth), `@supabase/ssr`, Next.js middleware.

**Data model.** `profiles`, `app_settings` per §15.2, with `set_updated_at()` trigger and `handle_new_user()` trigger. Seed `app_settings` with documented defaults for every key in `config/settings-schema.ts`.

**Tasks.**
- BE-1.1 Create Supabase dev project; commit migration `0001_init` (extensions, `set_updated_at`, `profiles`, `app_settings`, RLS, policies, `handle_new_user`).
- BE-1.2 Supabase clients: browser (anon), server (session), admin (service role, `server-only`).
- BE-1.3 Middleware session refresh + route protection for the `(app)` group.
- BE-1.4 `repositories/settings.ts` + `config/settings-schema.ts` with Zod and typed defaults.
- BE-1.5 Generate database types; add `npm run db:types` script.
- FE-1.1 Login page and auth actions.
- FE-1.2 App shell: sidebar, topbar, page container, breadcrumb, environment badge.
- FE-1.3 Empty-state component; apply to all eleven routes.
- FE-1.4 Settings page with a typed form per settings group.
- INT-1.1 Deploy to Vercel with dev environment variables; confirm auth works on the deployed URL.

**Routes.** `/login`, `/today`, `/performance`, `/funnel`, `/leads`, `/experiments`, `/playbook`, `/workflows`, `/reports`, `/integrations`, `/settings`.

**User flow.** Open app → redirected to `/login` → sign in → land on `/today` → navigate the shell → sign out.

**Edge cases.** Expired session mid-navigation → redirect with `next` preserved. Two tabs, one signs out → the other redirects on next action. Missing `profiles` row (trigger failed) → app shows a recoverable error, not a crash. `app_settings` key malformed → falls back to the documented default and surfaces a warning on `/settings`.

**Error handling.** Auth errors are generic to the user and detailed in server logs. A settings write that fails validation rejects the whole form and preserves input.

**Security.** Sign-up disabled in the Supabase dashboard (record it in `DECISIONS.md`; it is a console setting, not code). Service-role key only in the admin client. Cookies `httpOnly`/`secure`/`sameSite=lax`. No `anon` policy on any table.

**Testing checklist.** `TEST-1.1` middleware redirects unauthenticated · `TEST-1.2` `next` round-trip after login · `TEST-1.3` RLS: user A cannot read user B's profile · `TEST-1.4` settings Zod rejection path · `TEST-1.5` E2E login → today → logout · `TEST-1.6` service-role key absent from the client bundle (build-output grep).

**Acceptance criteria.**
- [ ] Login, logout and redirect-with-`next` all work on the deployed URL
- [ ] Self sign-up is impossible
- [ ] `profiles` row is created automatically for a new user
- [ ] All eleven routes render with a labelled empty state
- [ ] RLS enabled with policies on both tables; anon has no access
- [ ] Settings read/write round-trips with validation and audit fields
- [ ] Build output contains no service-role key
- [ ] All four verification commands pass

**Definition of done.** A fresh browser can reach `/today` only by authenticating, on the deployed environment, with RLS verified by test.

**Deliverables.** `0001_init` migration, Supabase clients, middleware, login page, app shell, settings page, generated types, first deployment.

**Codex implementation order.** 1) migration → 2) RLS policies + triggers → 3) generated types → 4) supabase clients → 5) middleware → 6) login + actions → 7) shell + empty states → 8) settings repository + page → 9) tests → 10) deploy.

---

## Phase 2 — Daily Workflow OS

**Overview.** Workflow templates, runs, items, notes, and `/today` v1 — the first phase that produces daily value.

**Objective.** Make the app worth opening every morning before any integration exists.

**User value.** The user runs a real daily checklist in the app, captures notes against the date, and sees a coherent Today page.

**Scope.** Workflow template CRUD (seeded, editable) · lazy run materialisation · step completion with notes · weekday-aware cadence · `/today` header, checklist, quick notes · `/workflows` history.

**Out of scope.** Alerts, priority actions, lead queues, data health, any cron, any integration, template versioning UI beyond a version counter.

**Dependencies.** Phase 1.

### Functional requirements

| ID | Requirement |
|---|---|
| FR-2.1 | The system ships with three seeded templates: Daily Ops (weekdays), Weekly Review (Monday), Monthly Review (first workday). |
| FR-2.2 | Opening `/today` materialises today's applicable runs exactly once; repeated loads never create duplicates. |
| FR-2.3 | A step can be completed and un-completed; `completed_at` is set and cleared accordingly. |
| FR-2.4 | A step accepts an optional note, saved without a full page reload. |
| FR-2.5 | A run's status derives from its items: `pending` → `in_progress` → `completed` when all required items are done. |
| FR-2.6 | `workflow_items.label_snapshot` preserves the step label as it was when the run was created; later template edits do not alter history. |
| FR-2.7 | The user can create, edit, deactivate and reorder templates and their steps. |
| FR-2.8 | Deactivating a template stops future runs but preserves past runs. |
| FR-2.9 | The user can add a dated free-text note from `/today`; notes are listed by date and retrievable for a period. |
| FR-2.10 | `/workflows` lists the last 30 days of runs with completion percentage and drill-down. |
| FR-2.11 | Business dates use Asia/Jakarta; a run created at 23:50 WIB belongs to that WIB day, not the UTC day. |

**Non-functional.** NFR-2.1 Step toggle reflects optimistically and reconciles with the server; a failed write reverts visibly. NFR-2.2 `/today` renders in ≤ 1.5 s with 90 days of history present.

**Tools.** Supabase, Next.js server functions, `date-fns-tz`.

**Data model.** `workflow_templates`, `workflow_runs`, `workflow_items`, `notes` (§15.2) plus their indexes and RLS policies. `domain/dates/business-date.ts` with `toJakartaDate`, `jakartaWeekday`, `jakartaWeekBounds`, `jakartaMonthBounds`.

**Tasks.**
- BE-2.1 Migration `0002_workflows` (four tables, indexes, RLS).
- BE-2.2 `domain/dates` helpers with exhaustive unit tests including midnight and month boundaries.
- BE-2.3 `services/workflows`: `getOrCreateRunsForDate`, `toggleItem`, `setItemNote`, `recomputeRunStatus`.
- BE-2.4 Seed migration for the three default templates.
- BE-2.5 `services/notes`: create, list by date range, list by context.
- FE-2.1 `/today` layout with progressive-section scaffold (empty placeholders for sections arriving in later phases, each labelled with its phase).
- FE-2.2 Checklist component with optimistic toggle and inline notes.
- FE-2.3 Quick Notes composer and day list.
- FE-2.4 `/workflows` history view with completion metrics.
- FE-2.5 Template editor (list, create, edit steps, reorder, deactivate).

**Routes.** `/today`, `/workflows`, `/workflows/templates`.

**User flow.** Morning → open `/today` → today's checklist is present → tick items, add a note on one → add a quick note → items persist across reload and devices.

**Edge cases.** First use of a template mid-day · timezone boundary at 00:00 WIB · a template edited while a run is open (snapshot protects it) · a weekend day with no applicable template (explicit "no checklist today" state, not a blank page) · deactivating a template with an in-progress run (run remains, no new ones created) · two tabs toggling the same item (last write wins, both reconcile).

**Error handling.** Failed toggle reverts the optimistic state and shows a retry affordance. Failed run materialisation shows the page with a banner rather than blocking the whole route.

**Security.** All writes go through authenticated server functions. RLS restricts to authenticated. No PII in notes is enforced by convention only — the field is free text, documented as such in the Playbook.

**Testing checklist.** `TEST-2.1` run materialisation idempotency · `TEST-2.2` weekday cadence selection across a full week · `TEST-2.3` WIB date boundary · `TEST-2.4` run status derivation from items · `TEST-2.5` label snapshot survives template edit · `TEST-2.6` E2E complete a checklist and reload.

**Acceptance criteria.**
- [ ] `/today` shows the correct checklist for the current WIB weekday
- [ ] Refreshing five times creates exactly one run per template per day
- [ ] Completed steps and notes survive reload and a different browser
- [ ] Editing a template does not alter a historical run's labels
- [ ] `/workflows` shows 30-day history with completion percentages
- [ ] Weekend/no-template days render an explicit state
- [ ] Four verification commands pass

**Definition of done.** The user has run the daily checklist in the app on at least one real workday without touching the database directly.

**Deliverables.** `0002_workflows` + seed migration, date domain module, workflow services, Today v1, workflows history, template editor.

**Codex implementation order.** 1) migration → 2) date domain + tests → 3) repositories → 4) services + tests → 5) seed templates → 6) Today shell + checklist → 7) notes → 8) history → 9) template editor → 10) E2E.

---

## Phase 3 — Playbook & SOP Knowledge Base

**Overview.** Structured operational knowledge with search, categories and deep-linkable slugs.

**Objective.** Move procedure out of memory and chat history into a surface that an alert can link to.

**User value.** The user finds the launch SOP or the tracking QA checklist in seconds, and keeps it current.

**Scope.** Article CRUD in markdown · five article types · tags and categories · full-text search · draft/published/archived · slug routing · five seeded articles.

**Out of scope.** Revision history, collaborative editing, AI generation, automatic retrieval from alerts, file attachments.

**Dependencies.** Phase 1. (Independent of Phase 2 — may be built in parallel.)

### Functional requirements

| ID | Requirement |
|---|---|
| FR-3.1 | The user can create, edit, publish, archive and delete an article. |
| FR-3.2 | Articles are addressable at `/playbook/[slug]`; slugs are unique and auto-generated from the title with manual override. |
| FR-3.3 | Markdown body renders with headings, lists, tables, checkboxes and code, and is sanitised against injected HTML. |
| FR-3.4 | Full-text search across title, summary, body and tags returns ranked results in ≤ 500 ms for up to 500 articles. |
| FR-3.5 | Articles are filterable by `article_type`, `category` and tag. |
| FR-3.6 | Publishing increments `version` and sets `published_at`. |
| FR-3.7 | Archived articles are excluded from search by default and reachable with an explicit filter. |
| FR-3.8 | Five articles are seeded: campaign launch SOP, tracking QA checklist, weekly review checklist, "CPL up — diagnostic tree", UTM & naming convention reference. |

**Non-functional.** NFR-3.1 Search uses a Postgres `tsvector` generated column with a GIN index, not `ILIKE` scans. NFR-3.2 Markdown rendering is sanitised (no raw HTML execution).

**Tools.** Supabase full-text search, a markdown renderer with a sanitiser.

**Data model.** `playbook_articles` (§15.2) plus `search_vector tsvector generated always as (...) stored` and a GIN index.

**Tasks.**
- BE-3.1 Migration `0003_playbook` (table, search vector, GIN index, RLS).
- BE-3.2 `repositories/playbook` + `services/playbook` (CRUD, slug generation with collision handling, search).
- BE-3.3 Seed migration with the five articles (real content, not lorem ipsum).
- FE-3.1 `/playbook` list with type/category/tag filters and search box.
- FE-3.2 `/playbook/[slug]` reader view with a table of contents for long articles.
- FE-3.3 Editor with markdown preview, type selector, tags and status control.

**Routes.** `/playbook`, `/playbook/new`, `/playbook/[slug]`, `/playbook/[slug]/edit`.

**User flow.** Search "tracking" → open the QA checklist → follow it → edit a step that has changed → publish.

**Edge cases.** Duplicate slug (suffix `-2`) · very long article (ToC + lazy render) · empty search results (offer to create an article) · archived article opened from an old link (banner, not 404) · markdown containing a script tag (sanitised).

**Error handling.** Save failure preserves the editor buffer in component state; the user never loses a draft to a network error.

**Security.** Sanitise rendered markdown. Article bodies are internal but may reference thresholds, not secrets — stated in the editor help text.

**Testing checklist.** `TEST-3.1` slug collision handling · `TEST-3.2` search ranking on seeded content · `TEST-3.3` status transitions · `TEST-3.4` markdown sanitisation of injected HTML · `TEST-3.5` E2E create → publish → find via search.

**Acceptance criteria.**
- [ ] Five seeded articles exist and are readable
- [ ] Search finds an article by a body-only term
- [ ] Filters narrow by type, category and tag
- [ ] Slug collisions resolve without error
- [ ] Injected HTML does not execute
- [ ] Four verification commands pass

**Definition of done.** The user has replaced at least one procedure previously kept in chat or a spreadsheet with a published article.

**Deliverables.** `0003_playbook` + seed, playbook service, list/reader/editor UI.

**Codex implementation order.** 1) migration + search vector → 2) repository/service → 3) seed content → 4) list + filters → 5) reader → 6) editor → 7) tests.

---

## Phase 4 — Experiment OS

**Overview.** Experiment lifecycle from backlog to documented learning.

**Objective.** Make "why did we change this, and what happened?" answerable months later.

**User value.** Every meaningful optimisation is recorded in under a minute and produces a searchable learning.

**Scope.** Experiment CRUD · lifecycle transitions · backlog prioritisation (priority/confidence/effort) · review date and duration guardrails · results with mandatory learning · learning library search · `/today` review queue section.

**Out of scope.** Statistical significance, automatic metric attachment from ad platforms, variant traffic splitting, multivariate design.

**Dependencies.** Phase 1 (Phase 2 for the Today queue section).

### Functional requirements

| ID | Requirement |
|---|---|
| FR-4.1 | The user can create an experiment with title, hypothesis, variable, primary KPI, start date and review date; all are required. |
| FR-4.2 | `code` is auto-generated as `EXP-YYYY-NNN`, unique and monotonic within a year. |
| FR-4.3 | Status transitions are constrained: `draft→running`, `running→completed`, any→`cancelled`. Invalid transitions are rejected with a clear message. |
| FR-4.4 | Completing an experiment requires outcome, primary KPI result, conclusion, learning and next action; empty `learning` blocks completion. |
| FR-4.5 | A review date earlier than `start_date + experiments.min_duration_days` triggers a visible warning at save time (not a hard block). |
| FR-4.6 | An outcome recorded with a result count below `metrics.min_results_for_verdict` is labelled *inconclusive by default* and the label is stored in `evidence`. |
| FR-4.7 | The backlog view sorts by a computed priority from priority, confidence and effort, and the formula is shown to the user. |
| FR-4.8 | Running experiments display elapsed days and days until review. |
| FR-4.9 | The learning library is searchable by variable, KPI, outcome and free text across conclusion and learning. |
| FR-4.10 | `/today` lists experiments whose `review_date <= today` and status is `running`. |
| FR-4.11 | `external_refs` accepts campaign/adset/ad ids and URLs and validates their shape. |

**Non-functional.** NFR-4.1 Creating an experiment takes at most one screen and no more than seven required fields.

**Tools.** Supabase, Next.js server functions, Zod.

**Data model.** `experiments`, `experiment_results` (§15.2) with indexes on `(status, review_date)` and a search vector over conclusion/learning.

**Tasks.**
- BE-4.1 Migration `0004_experiments`.
- BE-4.2 `domain/experiments/state.ts` — transition table, priority score, duration and sample guardrails, all pure and tested.
- BE-4.3 `services/experiments` — create, transition, complete, search; code generation with a race-safe sequence.
- FE-4.1 `/experiments` with Backlog / Running / Completed tabs.
- FE-4.2 Create and edit form with inline guardrail warnings.
- FE-4.3 `/experiments/[id]` detail with timeline and result panel.
- FE-4.4 Completion dialog enforcing required fields.
- FE-4.5 Learning library search view.
- FE-4.6 Today review-queue section.

**Routes.** `/experiments`, `/experiments/new`, `/experiments/[id]`, `/experiments/learnings`.

**User flow.** Idea → backlog entry → promote to running with hypothesis and review date → review date arrives → it appears on `/today` → complete with outcome and learning → it becomes searchable.

**Edge cases.** Two experiments created in the same second (sequence handles it) · experiment cancelled after results were partially entered · review date in the past at creation · concurrent completion from two tabs (second gets `CONFLICT`) · year rollover in the code sequence.

**Error handling.** Invalid transitions return `BUSINESS_RULE_REJECTED` with the allowed transitions listed.

**Security.** Authenticated only; no external exposure.

**Testing checklist.** `TEST-4.1` transition table exhaustively · `TEST-4.2` code generation uniqueness under concurrency · `TEST-4.3` completion validation rejects empty learning · `TEST-4.4` priority score ordering · `TEST-4.5` duration/sample warnings · `TEST-4.6` E2E create → run → complete → find in library.

**Acceptance criteria.**
- [ ] Full lifecycle works end to end and persists
- [ ] Completion without a learning is impossible
- [ ] Review queue appears on `/today` on the review date
- [ ] Backlog ordering matches the displayed formula
- [ ] Short-duration and small-sample warnings appear
- [ ] Four verification commands pass

**Definition of done.** At least one real experiment has been recorded and completed in the app.

**Deliverables.** `0004_experiments`, experiment domain module, services, four UI surfaces, Today section.

**Codex implementation order.** 1) migration → 2) domain state machine + tests → 3) services → 4) list/tabs → 5) create/edit → 6) detail + completion → 7) library search → 8) Today section → 9) E2E.

---

## Phase 5 — Lead & Funnel Core

**Overview.** The commercial heart of the system: contacts, companies, inquiries, deals, stage events, the qualification engine, and funnel views — all usable with manual and imported data.

**Objective.** Get the data model and the definition of a qualified lead right **before** any sync exists, so that Phase 7 is a transport problem rather than a redesign.

**User value.** Every inquiry is in one place with its attribution, its quality verdict and its history, and the funnel is visible without a spreadsheet.

**Scope.** `companies`, `contacts`, `leads`, `lead_stage_events`, `deals` · manual lead entry · CSV import with mapping and dry run · qualification engine v1 · manual override with reason · funnel views · `/leads`, `/leads/[id]`, `/funnel` · Today follow-up queue · KPI formula layer (lead-side metrics only; spend-dependent metrics render `—` until Phase 9).

**Out of scope.** Any HubSpot call, any ingest API, spend data, alerts, Slack, decision rules.

**Dependencies.** Phase 1 (Phase 2 for the Today section).

### Functional requirements

| ID | Requirement |
|---|---|
| FR-5.1 | The user can create a lead manually with contact, company, inquiry and attribution fields; only `occurred_at` and a contact channel are mandatory. |
| FR-5.2 | Creating a lead resolves an existing contact by email, then phone, then creates one; the same rule applies to companies by domain then name. |
| FR-5.3 | A lead is stored even with no attribution data, with `platform='unknown'` and an attribution-missing flag. |
| FR-5.4 | `dedupe_key` is deterministic (contact identity + inquiry window + product interest) and prevents the same inquiry being stored twice. |
| FR-5.5 | The qualification engine runs on every lead creation and produces status, reason codes and `qualification_rule_version`. |
| FR-5.6 | Rules and thresholds are read from `app_settings.qualification`; changing a threshold changes future verdicts only. |
| FR-5.7 | A user can override a qualification status with a mandatory reason; the override writes `lead_stage_events` with `source='manual'` and is never auto-reverted. |
| FR-5.8 | Every status change appends a `lead_stage_events` row; the table is append-only. |
| FR-5.9 | CSV import supports column mapping, a dry-run preview showing created/updated/skipped counts and row-level errors, and an atomic commit. |
| FR-5.10 | Re-importing the same CSV produces zero duplicates. |
| FR-5.11 | `/leads` filters by status, channel, platform, campaign, date range, attribution completeness and owner, with server-side pagination. |
| FR-5.12 | `/leads/[id]` shows identity, company, requirement, attribution block, full stage timeline, linked deal, and flags. |
| FR-5.13 | Deals can be created and edited manually in Phase 5, and linked to a lead. |
| FR-5.14 | `/funnel` renders the cohort funnel (leads → MQL → SQL → opportunity → won) with counts and conversion rates, and states its cohort basis and maturity window on screen. |
| FR-5.15 | Metrics that require spend render as `—` with a "no spend data until Phase 9" tooltip, never as `0`. |
| FR-5.16 | `/today` shows a follow-up queue: leads in `new` awaiting review, plus MQL/SQL past their SLA. |

**Non-functional.** NFR-5.1 `/leads` returns the first page in ≤ 800 ms with 50,000 rows. NFR-5.2 The qualification engine is pure and deterministic: same input plus same settings yields the same verdict, with no I/O. NFR-5.3 CSV import of 5,000 rows completes in ≤ 60 s and reports progress.

**Tools.** Supabase, Zod, TanStack Table, a CSV parser.

**Data model.** `companies`, `contacts`, `leads`, `lead_stage_events`, `deals`, and views `vw_funnel_daily`, `vw_funnel_activity_daily`, `vw_lead_quality_by_campaign`, `vw_attribution_coverage` (§15.2–15.3), with the indexes of §15.4.

**Tasks.**
- BE-5.1 Migration `0005_crm_core` (five tables, constraints, indexes, RLS — mirrors writable by service role only).
- BE-5.2 Migration `0006_funnel_views` (four views, documented cohort semantics in SQL comments).
- BE-5.3 `domain/qualification` — rules v1, reason codes, version constant, exhaustive unit tests including every disqualify and qualify branch.
- BE-5.4 `domain/metrics/formulas.ts` — all formulas from §24.1 with null-safety tests.
- BE-5.5 `domain/attribution/normalise.ts` — email lowercase, phone → E.164 (Indonesian defaults), UTM trimming, free-provider and competitor domain lists from settings.
- BE-5.6 `services/leads` — create, resolve contact/company, qualify, override, dedupe key, stage events.
- BE-5.7 CSV import service with mapping, dry run and transactional commit.
- BE-5.8 `services/deals` — manual CRUD and lead linkage.
- FE-5.1 `/leads` table with filters, saved filter state in URL, pagination.
- FE-5.2 `/leads/new` manual entry form.
- FE-5.3 `/leads/[id]` detail with timeline, attribution block and flags.
- FE-5.4 Qualification override dialog with reason.
- FE-5.5 CSV import wizard (upload → map → dry run → commit → result report).
- FE-5.6 `/funnel` cohort funnel with basis and maturity disclosure.
- FE-5.7 Today follow-up queue section.

**Routes.** `/leads`, `/leads/new`, `/leads/[id]`, `/leads/import`, `/funnel`.

**User flow.** A WhatsApp inquiry arrives → the user records it in `/leads/new` → the engine marks it MQL with reasons → it appears in the funnel and on `/today` → sales responds → the user updates the status with a reason → the timeline shows the full history.

**Edge cases.** Two contacts sharing a phone number (partial unique index rejects; the UI offers to attach to the existing contact) · a lead with no email and no phone (rejected with `DQ_NO_CONTACT` but still stored as disqualified, because the volume matters) · a company with no domain · a CSV with a wrong encoding or a missing required column (rejected before any write) · a repeat inquiry from an existing contact (new `leads` row, same contact — this is correct, and the UI states it) · timezone-crossing inquiry timestamps · an `estimated_quantity` of zero versus null.

**Error handling.** Import errors are reported per row without aborting the report. A failed deduplication check refuses the write with `CONFLICT` rather than creating a probable duplicate.

**Security.** Lead PII is stored but never logged. Mirrors are written only through server functions using the service role after session verification. The CSV file is processed in memory and never persisted to storage.

**Testing checklist.** `TEST-5.1` every qualification branch · `TEST-5.2` phone/email normalisation including Indonesian formats (`08…`, `+62…`, `62…`) · `TEST-5.3` dedupe key stability and collision behaviour · `TEST-5.4` contact/company resolution order · `TEST-5.5` stage events append-only · `TEST-5.6` view correctness against a seeded fixture with a known expected funnel · `TEST-5.7` cohort vs activity basis produce different, correct numbers on a crafted fixture · `TEST-5.8` CSV re-import idempotency · `TEST-5.9` all metric formulas with zero and null denominators · `TEST-5.10` E2E create → qualify → override → funnel reflects it.

**Acceptance criteria.**
- [ ] A lead can be created manually and is qualified with visible reasons
- [ ] The same inquiry cannot be stored twice; a genuine repeat inquiry can
- [ ] CSV import of a HubSpot export works, and re-importing changes nothing
- [ ] The funnel matches hand-calculated numbers on the seeded fixture
- [ ] Cohort basis and maturity window are stated on screen
- [ ] Spend-dependent metrics show `—`, not `0`
- [ ] Stage timeline shows every change with actor and source
- [ ] RLS prevents any anon access to `leads`
- [ ] Four verification commands pass

**Definition of done.** The user has entered or imported real leads and can answer "how many MQLs did we get last week, and from where?" without leaving the app.

**Deliverables.** Two migrations, qualification domain module, metrics module, attribution normalisation, lead and deal services, CSV import, four UI surfaces, Today queue.

**Codex implementation order.** 1) `0005` migration → 2) `0006` views → 3) metrics domain + tests → 4) normalisation + tests → 5) qualification domain + tests → 6) repositories → 7) lead service + tests → 8) leads table UI → 9) manual entry → 10) detail + timeline → 11) override → 12) CSV import → 13) funnel → 14) Today queue → 15) E2E.

---

## Phase 6 — Lead Ingest API & n8n Foundation

**Overview.** The signed machine entry point into PM OS, plus the n8n baseline every later integration reuses.

**Objective.** One authenticated, idempotent, observable path for inbound data — built once, reused by HubSpot, Meta, and every future source.

**User value.** Leads from landing pages and the WhatsApp gateway arrive automatically, with failures visible instead of silent.

**Scope.** `POST /api/ingest/lead` with HMAC + replay window + idempotency · `webhook_events` · `integration_runs` · `sync_state` · `/api/cron/[job]` with `CRON_SECRET` · n8n instance baseline (`WF-LEAD-RELAY`, `WF-ERROR`, `WF-SLACK-SEND` stub) · `/integrations` v1 showing run history.

**Out of scope.** HubSpot, Meta, Slack message content (the sub-workflow exists but sends only to the dev channel), decision rules.

**Dependencies.** Phase 5.

### Functional requirements

| ID | Requirement |
|---|---|
| FR-6.1 | `POST /api/ingest/lead` accepts the §23.2 contract, validated by Zod; an invalid payload returns 400 with field-level errors and is stored as `webhook_events.status='rejected'`. |
| FR-6.2 | Requests require `X-Signature` (HMAC-SHA256 over `timestamp.method.path.rawBody`), `X-Timestamp` and `Idempotency-Key`; a missing or invalid signature returns 401 and is logged without the body. |
| FR-6.3 | A timestamp outside ±300 s is rejected as a replay. |
| FR-6.4 | A repeated `Idempotency-Key` returns 200 with the original result and `"replayed": true`, and performs no write. |
| FR-6.5 | A successful ingest creates contact/company/lead through the **same service functions as manual entry** — no parallel implementation. |
| FR-6.6 | Every request writes a `webhook_events` row with the raw payload, and every processing attempt writes an `integration_runs` row carrying `X-Correlation-Id`. |
| FR-6.7 | Payloads above 256 KB or with a non-JSON content type are rejected before parsing. |
| FR-6.8 | `POST /api/cron/[job]` authenticates with `CRON_SECRET`, is idempotent per job per window, and refuses concurrent execution of the same job. |
| FR-6.9 | `/integrations` lists integration runs with status, timing, counts, correlation id and redacted errors, filterable by integration and status. |
| FR-6.10 | `WF-LEAD-RELAY` signs and relays payloads, retries retryable failures up to five times with backoff, and dead-letters to `WF-ERROR` afterwards. |
| FR-6.11 | `WF-ERROR` posts a single failure event per failed execution to PM OS; it never loops. |

**Non-functional.** NFR-6.1 Ingest responds in ≤ 500 ms p95; long work is not done inside the request. NFR-6.2 The endpoint remains correct under duplicate concurrent delivery (unique constraint, not application-level checking). NFR-6.3 Signature comparison is constant-time.

**Tools.** Next.js route handlers, Node `crypto`, Zod, n8n, Supabase.

**Data model.** `webhook_events`, `sync_state`, `integration_runs` (§15.2) with their indexes and service-role-only RLS. `leads.source_event_id` FK added here.

**Tasks.**
- BE-6.1 Migration `0007_integration_plumbing`.
- BE-6.2 `lib/http/hmac.ts` — sign and verify, constant-time, with tests including tampered body and stale timestamp.
- BE-6.3 `lib/http/idempotency.ts` — insert-or-return semantics on the unique constraint.
- BE-6.4 `POST /api/ingest/lead` route handler wired to `services/leads`.
- BE-6.5 `POST /api/cron/[job]` dispatcher with a job registry, `CRON_SECRET` auth and a concurrency lock.
- BE-6.6 `services/integration-runs` — start, finish, fail, with correlation id propagation.
- FE-6.1 `/integrations` run history table with filters and a detail drawer.
- AUT-6.1 n8n: `WF-LEAD-RELAY` with signing, retry and dead-letter.
- AUT-6.2 n8n: `WF-ERROR` global error workflow.
- AUT-6.3 n8n: `WF-SLACK-SEND` sub-workflow (dev channel only in this phase).
- AUT-6.4 Document every workflow in `INTEGRATIONS.md` with trigger, input, output and failure behaviour; commit scrubbed JSON exports.

**Routes.** `/api/ingest/lead`, `/api/cron/[job]`, `/api/health`, `/integrations`.

**User flow.** A form submission hits n8n → n8n signs and relays → PM OS validates, stores and qualifies → the lead appears in `/leads` within seconds → the run is visible in `/integrations`.

**Edge cases.** Duplicate webhook delivery · out-of-order delivery · clock skew at the replay boundary · malformed JSON · oversized payload · valid signature with an invalid body schema (401 vs 400 distinction matters) · n8n retrying after a 500 that actually succeeded (idempotency key protects) · secret rotation mid-flight (support two valid secrets during a rotation window).

**Error handling.** 4xx is terminal and must not be retried by n8n; 5xx and network failures are retried. Every rejection is stored with its reason so "the lead never arrived" can be answered with evidence.

**Security.** Ingest secret distinct from `CRON_SECRET` and from Supabase keys. Failed-signature logs never include the body. Payload retained 90 days then nulled. n8n credentials in its own store; exports scrubbed by the pre-commit check.

**Testing checklist.** `TEST-6.1` valid signature accepted · `TEST-6.2` tampered body rejected · `TEST-6.3` stale timestamp rejected · `TEST-6.4` duplicate idempotency key returns the original and writes nothing · `TEST-6.5` concurrent identical requests create exactly one lead · `TEST-6.6` oversized payload rejected · `TEST-6.7` cron endpoint rejects a wrong secret · `TEST-6.8` cron concurrency lock · `TEST-6.9` integration run rows written on success and failure.

**Acceptance criteria.**
- [ ] A signed test payload creates a lead end to end through n8n
- [ ] An unsigned or tampered payload is rejected and logged without PII
- [ ] Sending the same payload ten times creates one lead
- [ ] `/integrations` shows the runs with correlation ids
- [ ] Killing PM OS mid-relay results in an n8n retry and exactly one lead
- [ ] No credential appears in the committed n8n export
- [ ] Four verification commands pass

**Definition of done.** A real landing-page or gateway submission reaches `/leads` automatically, and a deliberately broken submission is visible in `/integrations` rather than lost.

**Deliverables.** `0007` migration, HMAC and idempotency libraries, ingest and cron handlers, integration-run service, `/integrations` v1, three n8n workflows, `INTEGRATIONS.md`.

**Codex implementation order.** 1) migration → 2) HMAC lib + tests → 3) idempotency lib + tests → 4) ingest route + tests → 5) integration-run service → 6) cron dispatcher → 7) `/integrations` UI → 8) n8n workflows → 9) end-to-end verification with a real relay.
---

## Phase 7 — HubSpot CRM Integration

**Overview.** Bidirectional-lite sync: HubSpot remains the system of record; PM OS mirrors it and writes only at ingest and qualification.

**Objective.** Connect marketing acquisition to sales outcome without creating a second CRM.

**User value.** Lead stages, deals and revenue appear in PM OS without manual entry, and divergence is visible instead of assumed.

**Scope.** HubSpot client with retry and rate limiting · configurable mapping layer · contact/company/deal upsert · webhook receiver · 30-minute cursor-based reconcile · `lead_stage_events` from HubSpot · deal↔lead linkage · manual re-sync · integration health for HubSpot.

**Out of scope.** Writing deal stage/owner/amount, merging CRM records, custom object support, HubSpot marketing email or workflow management, lifecycle-stage write-back unless explicitly enabled in settings.

**Dependencies.** Phases 5 and 6. **External precondition:** HubSpot custom properties from §19.2 created, private app token issued with minimum scopes, pipeline and stage ids recorded in settings (Appendix A).

### Functional requirements

| ID | Requirement |
|---|---|
| FR-7.1 | A server-side HubSpot client handles auth, bounded retry with backoff, and client-side throttling; it is the only module that calls HubSpot. |
| FR-7.2 | The mapping in `app_settings.hubspot.mapping` is validated with Zod on read; an invalid mapping disables sync and raises a `CRITICAL` alert rather than syncing with guesses. |
| FR-7.3 | An unmapped lifecycle or deal stage is stored raw, categorised `open`, and raises a `WARNING` alert naming the value. It is never silently mapped. |
| FR-7.4 | Lead ingest creates or updates the HubSpot Contact, associates the Company, and stores `hubspot_contact_id` on the PM OS contact. |
| FR-7.5 | First-touch properties are written to HubSpot only when the corresponding property is empty. |
| FR-7.6 | On MQL, PM OS writes `lead_quality_reason`, `pmos_qualified_at` and `pmos_lead_id`; it writes `lifecycle_stage` only if `hubspot.write_lifecycle_stage` is true (default false). |
| FR-7.7 | `POST /api/ingest/hubspot` verifies the HubSpot request signature, validates the payload and processes contact and deal change events idempotently. |
| FR-7.8 | A scheduled reconcile every 30 minutes pulls records modified since `sync_state.cursor` minus a 5-minute overlap and upserts them; running it twice changes nothing. |
| FR-7.9 | Any mirrored status change appends `lead_stage_events` with `source='hubspot'`. |
| FR-7.10 | A deal is linked to its originating lead by `pmos_lead_id`, falling back to contact association; an unlinkable deal is stored and flagged rather than dropped. |
| FR-7.11 | Contact resolution ambiguity (two candidate matches) refuses the write with `CONFLICT` and raises a `WARNING` alert for human resolution. |
| FR-7.12 | `/integrations` offers a manual re-sync for a date range or a single record id, and shows HubSpot health per §31.1. |
| FR-7.13 | Won deals are attributed per §23.3 and stamped with `attribution_rule_version`. |

**Non-functional.** NFR-7.1 A reconcile of 1,000 modified records completes within one sync window. NFR-7.2 HubSpot downtime degrades to `FAILING` health without breaking any page. NFR-7.3 No HubSpot token appears in any log, error message or UI surface.

**Tools.** HubSpot CRM API (private app token), n8n, Supabase, Zod.

**Data model.** No new tables. Adds: `contacts.hubspot_contact_id` population, `deals` population, `sync_state` rows for `hubspot:contacts` and `hubspot:deals`.

**Tasks.**
- BE-7.1 `integrations/hubspot/client.ts` — auth, retry, throttle, typed methods for the objects actually used.
- BE-7.2 `integrations/hubspot/mapping.ts` — Zod schema, loader, unmapped-value reporting.
- BE-7.3 `integrations/hubspot/transform.ts` — HubSpot record → PM OS row, pure and tested against committed fixtures.
- BE-7.4 `services/crm-sync` — upsert contact/company/deal, link deal to lead, emit stage events, write `sync_state` and `integration_runs`.
- BE-7.5 `POST /api/ingest/hubspot` webhook receiver with signature verification.
- BE-7.6 `/api/cron/hubspot-reconcile` cursor-based job.
- BE-7.7 Write-back service (narrow, feature-flagged).
- FE-7.1 `/integrations/hubspot` detail: health, cursor position, last runs, unmapped values, manual re-sync.
- FE-7.2 Lead detail: HubSpot deep link, sync status, divergence indicator.
- AUT-7.1 `WF-HUBSPOT-WEBHOOK-RELAY`.
- AUT-7.2 `WF-HUBSPOT-RECONCILE` schedule.

**Routes.** `/api/ingest/hubspot`, `/api/cron/hubspot-reconcile`, `/integrations/hubspot`.

**User flow.** Sales moves a deal to Closed Won in HubSpot → within 30 minutes (or seconds via webhook) the deal, its stage and its revenue appear in PM OS, attributed to the originating campaign, and the funnel updates.

**Edge cases.** Webhook received before the contact exists locally (create from the webhook, then reconcile) · a deleted or merged HubSpot record (mark mirrored row `source_updated_at` and flag; never cascade-delete) · a contact with multiple associated companies (take the primary; flag the rest) · a deal with no contact · rate limiting mid-batch (partial status, resume from cursor) · a property renamed in HubSpot (mapping validation catches it and disables sync loudly) · a portal-wide bulk edit producing thousands of change events (reconcile absorbs them; webhook relay rate-limits).

**Error handling.** A failed batch records `partial` with `records_failed`; failed record ids are re-attempted on the next run rather than being lost. Three consecutive failures raise a `CRITICAL` alert and set health to `FAILING`.

**Security.** Minimum scopes only. Token in server env and n8n credential store. Webhook signature verified. HubSpot ids are not secrets but portal internals are not exposed publicly.

**Testing checklist.** `TEST-7.1` transform fixtures for contact, company, deal · `TEST-7.2` mapping validation rejects a malformed config · `TEST-7.3` unmapped stage produces an alert and does not guess · `TEST-7.4` reconcile idempotency across the overlap window · `TEST-7.5` webhook signature verification · `TEST-7.6` deal→lead linkage and fallback · `TEST-7.7` ambiguity refusal · `TEST-7.8` first-touch write-once · `TEST-7.9` rate-limit backoff behaviour against a mocked 429 · `TEST-7.10` HubSpot down → app still renders with degraded health.

**Acceptance criteria.**
- [ ] A new lead appears in HubSpot with the correct attribution properties
- [ ] A stage change in HubSpot appears in PM OS with a stage event
- [ ] Running the reconcile twice changes no data
- [ ] An unmapped stage produces a named alert, not a silent default
- [ ] A won deal is linked to its lead and attributed
- [ ] HubSpot unavailable → health `FAILING`, app fully usable
- [ ] No token in any log or client bundle
- [ ] Four verification commands pass

**Definition of done.** For one full working week, the leads and deals in PM OS match HubSpot without manual correction, and any mismatch that occurred is explained by a logged run.

**Deliverables.** HubSpot client, mapping, transforms, sync service, webhook and cron endpoints, integration detail UI, two n8n workflows, fixtures.

**Codex implementation order.** 1) client + throttle → 2) mapping + validation → 3) transforms + fixtures → 4) sync service + idempotency tests → 5) reconcile job → 6) webhook receiver → 7) write-back (flagged off) → 8) UI → 9) n8n workflows → 10) week-long verification.

---

## Phase 8 — Alerts & Slack Notifications

**Overview.** A first-class alert domain with dedupe, severity and lifecycle, plus Slack as its first transport.

**Objective.** Make failure and opportunity impossible to miss, without producing notification fatigue.

**User value.** The user learns about a new MQL, a stale lead or a broken integration without watching dashboards.

**Scope.** `alerts` table and lifecycle · deterministic `alert_key` dedupe · severity routing per §20.2 · in-app alert centre on `/today` and `/integrations` · Slack delivery with quiet hours and digests · acknowledge, resolve, snooze · alert → playbook article linking.

**Out of scope.** Interactive Slack components, Events API, email or WhatsApp notification, decision-engine verdicts (Phase 10).

**Dependencies.** Phases 5 and 6 (Phase 7 for CRM-sourced alerts).

### Functional requirements

| ID | Requirement |
|---|---|
| FR-8.1 | An alert is created with a deterministic `alert_key`; re-raising an unresolved alert with the same key increments `occurrence_count` and updates `last_seen_at` instead of creating a row. |
| FR-8.2 | Alert lifecycle: `open → acknowledged → resolved`, plus `suppressed`. Transitions are recorded with timestamp and reason. |
| FR-8.3 | An alert whose condition no longer holds auto-resolves on the next evaluation, with `resolved_reason='condition_cleared'`. |
| FR-8.4 | Severity routing follows §20.2; `info` and rule verdicts stay in-app. |
| FR-8.5 | At most one Slack message per `alert_key` per day; `notification_count` records every send. |
| FR-8.6 | More than five messages of one category within an hour collapse into a digest. |
| FR-8.7 | `info` alerts outside 07:00–20:00 WIB are batched into the next morning digest. |
| FR-8.8 | Slack messages contain identifiers and links only — no contact name, email, phone or message body. |
| FR-8.9 | `/today` shows open alerts grouped by severity with acknowledge and snooze controls. |
| FR-8.10 | An alert type can reference a playbook slug; the alert renders a direct link to the procedure. |
| FR-8.11 | A Slack delivery failure is recorded and raises an in-app alert; notification failure is never silent. |

**Non-functional.** NFR-8.1 Alert evaluation for a day's data completes in ≤ 10 s. NFR-8.2 Notification volume is itself measurable on `/integrations` (messages per day per type) so fatigue is detectable.

**Tools.** Supabase, n8n `WF-SLACK-SEND`, Slack Incoming Webhook.

**Data model.** `alerts` (§15.2) with the partial unique index on `alert_key` where `status <> 'resolved'`.

**Tasks.**
- BE-8.1 Migration `0008_alerts`.
- BE-8.2 `domain/alerts/keys.ts` — deterministic key construction per alert type, unit-tested for stability.
- BE-8.3 `services/alerts` — raise, refresh, acknowledge, snooze, resolve, auto-resolve sweep.
- BE-8.4 Alert producers for Phase 5–7 conditions: new MQL, new SQL, deal won/lost, stale lead, unmapped stage, integration failure, integration recovered, attribution coverage low.
- BE-8.5 Notification dispatcher implementing quiet hours, per-key daily cap and digest collapse.
- BE-8.6 `/api/cron/stale-leads` and `/api/cron/data-health` jobs.
- FE-8.1 Today alert section grouped by severity.
- FE-8.2 Alert detail drawer with evidence, history and playbook link.
- FE-8.3 Notification-volume panel on `/integrations`.
- AUT-8.1 `WF-STALE-LEAD-DIGEST`, `WF-DATA-HEALTH` schedules; `WF-SLACK-SEND` pointed at the production channel.

**Routes.** `/today` (alert section), `/integrations` (notification panel), `/api/cron/stale-leads`, `/api/cron/data-health`.

**User flow.** A qualified lead arrives → Slack shows an MQL card with links → the user opens PM OS → acknowledges → sales acts → the stale-lead alert never fires. If sales does not act, a digest appears two workdays later.

**Edge cases.** The same condition firing every hour (dedupe) · an alert resolving and re-firing in the same day (allowed; counts as one message) · Slack webhook revoked (in-app alert, delivery marked failed) · clock crossing the quiet-hours boundary mid-batch · an alert whose entity is deleted (alert survives with a tombstone reference) · a flood at midnight WIB (digest to morning).

**Error handling.** Delivery failures retry within `WF-SLACK-SEND` then dead-letter to an in-app `CRITICAL` alert. An alert-producer exception never blocks the job that hosts it; it is caught, logged and reported.

**Security.** No PII in Slack (NFR-G5) — enforced by a serialiser that accepts only an allowlisted field set, tested. Webhook URL server-side only. Dev and production use different channels.

**Testing checklist.** `TEST-8.1` key determinism and stability across runs · `TEST-8.2` dedupe increments rather than inserts · `TEST-8.3` auto-resolve on cleared condition · `TEST-8.4` daily cap enforcement · `TEST-8.5` digest collapse at threshold · `TEST-8.6` quiet-hours batching across the boundary · `TEST-8.7` Slack payload contains no PII field (allowlist test) · `TEST-8.8` delivery failure produces an in-app alert.

**Acceptance criteria.**
- [ ] A new MQL produces exactly one Slack message
- [ ] The same condition re-firing ten times produces one alert row and one message
- [ ] Stale leads arrive as a single daily digest
- [ ] Acknowledge and snooze persist and remove the item from Today
- [ ] No Slack message contains a name, email, phone or message body
- [ ] Slack failure is visible in-app
- [ ] Four verification commands pass

**Definition of done.** One week of real operation with no duplicate notifications and no missed critical condition.

**Deliverables.** `0008` migration, alert domain and service, producers, dispatcher, two cron jobs, Today and integrations UI, n8n workflows.

**Codex implementation order.** 1) migration → 2) key domain + tests → 3) alert service + lifecycle tests → 4) producers → 5) dispatcher with policy tests → 6) cron jobs → 7) Slack sub-workflow to production channel → 8) UI → 9) one-week observation.

---

## Phase 9 — Paid Media Data & Performance Surfaces

**Overview.** Meta Ads daily ingest into a platform-agnostic fact table, plus the performance and campaign-diagnostic surfaces that finally make spend-based metrics real.

**Objective.** Join cost to quality: CPL, CPQL and CPSQL per campaign, with honest freshness and coverage disclosure.

**User value.** The user sees which campaigns produce qualified pipeline, not just cheap leads.

**Scope.** `ad_accounts`, `ad_metrics_daily` · Meta connector with 3-day lookback · currency and timezone handling · `/performance` overview · `/performance/meta` campaign diagnostics · campaign→lead joining · freshness checks · naming-convention parsing and compliance metric.

**Out of scope.** Ad-level (adset/ad) ingest, GA4, Google Ads, creative dimension analysis, any write to Meta, automated budget action.

**Dependencies.** Phases 5 and 6 (Phase 8 for freshness alerts).

### Functional requirements

| ID | Requirement |
|---|---|
| FR-9.1 | Ad accounts are registered with platform, external id, name, currency and timezone. |
| FR-9.2 | A daily job ingests the previous day plus a 3-day lookback and upserts on the unique tuple; re-running changes no row count. |
| FR-9.3 | Metrics are stored at campaign grain with `adset_id` and `ad_id` as `''`, preserving the ad-level path without a future migration. |
| FR-9.4 | Each row stores `currency` and `source_timezone`; aggregating across differing currencies is refused and raises a data-health alert. |
| FR-9.5 | The Graph API version is pinned in configuration with its verification date. |
| FR-9.6 | Token expiry is tracked; a `WARNING` alert fires 14 days before expiry. |
| FR-9.7 | `/performance` shows the KPI strip (spend, leads, CPL, MQL, CPQL, SQL, CPSQL, opportunities, revenue) with previous-period comparison, each stating basis, window and freshness. |
| FR-9.8 | `/performance/meta` lists campaigns with spend, impressions, clicks, CTR, CPC, leads, MQL, CPQL and a period comparison, sortable and filterable. |
| FR-9.9 | Campaign-to-lead joining uses `lt_campaign` and `campaign_id`; unjoinable spend and unattributed leads are each shown as explicit reconciliation lines, never hidden. |
| FR-9.10 | Any metric whose sources are stale beyond SLA renders with a stale badge and the age of the oldest source. |
| FR-9.11 | Campaign and ad names are parsed per §23.5; a naming-compliance percentage is displayed on `/integrations`. |
| FR-9.12 | A manual re-ingest for an arbitrary date range is available on `/integrations`. |

**Non-functional.** NFR-9.1 A 90-day campaign query returns in ≤ 1 s with 200k rows. NFR-9.2 Ingest of 90 days completes within the job window and reports progress. NFR-9.3 Meta downtime does not affect any non-performance page.

**Tools.** Meta Marketing API (`ads_read`), n8n schedule, Supabase, Recharts, TanStack Table.

**Data model.** `ad_accounts`, `ad_metrics_daily` (§15.2) and the indexes of §15.4; `vw_lead_quality_by_campaign` becomes fully populated.

**Tasks.**
- BE-9.1 Migration `0009_ad_metrics`.
- BE-9.2 `integrations/meta/client.ts` — pinned version, insights query, pagination, retry, token expiry read.
- BE-9.3 `integrations/meta/transform.ts` — response → row, tested against committed fixtures including a zero-spend day and a missing-result-type day.
- BE-9.4 `services/ad-metrics` — upsert, lookback restatement, run logging.
- BE-9.5 `/api/cron/meta-ingest` with a date-range parameter.
- BE-9.6 `domain/attribution/naming.ts` parser + compliance metric.
- BE-9.7 Reconciliation service: spend without leads, leads without spend, by campaign and period.
- FE-9.1 `/performance` overview with KPI strip, trend chart and funnel.
- FE-9.2 `/performance/meta` campaign table with comparison and column control.
- FE-9.3 Reconciliation panel.
- FE-9.4 Stale-data badges and freshness tooltips across performance surfaces.
- AUT-9.1 `WF-META-DAILY-INGEST` at 06:00 WIB.

**Routes.** `/performance`, `/performance/meta`, `/api/cron/meta-ingest`.

**User flow.** 06:00 the job runs → the user opens `/performance` → sees yesterday's spend against MQL and CPQL by campaign → drills into a campaign → sees the reconciliation line showing that 18% of spend has no matching leads → investigates tracking rather than creative.

**Edge cases.** Meta restating a prior day (lookback handles it; the UI notes that recent days may change) · an account in USD while deals are in IDR (refuse to combine; show both) · an account timezone that is not WIB (display the offset; do not silently shift) · a campaign renamed mid-flight (id is the key, name is a label; show both) · zero-spend days (row exists with zeros, distinct from no row at all) · a token expiring mid-job (fail loudly, alert) · a campaign that exists in Meta but has no leads and vice versa.

**Error handling.** Partial ingest marks `partial`, records failed date/account pairs, and retries them next run. A failed ingest never deletes previously good rows.

**Security.** `ads_read` only. Token server-side. No account id or token in client-visible state beyond the display name.

**Testing checklist.** `TEST-9.1` transform fixtures · `TEST-9.2` upsert idempotency across the lookback window · `TEST-9.3` currency mismatch refusal · `TEST-9.4` timezone metadata preserved · `TEST-9.5` naming parser across valid and invalid names · `TEST-9.6` campaign-lead join and reconciliation arithmetic on a fixture · `TEST-9.7` stale badge appears past SLA · `TEST-9.8` performance page renders with zero ad data.

**Acceptance criteria.**
- [ ] Yesterday's Meta spend appears by 07:00 WIB
- [ ] Re-running ingest for the same range changes nothing
- [ ] CPQL per campaign matches a hand calculation on a fixture
- [ ] Unjoined spend and unattributed leads are both displayed, not hidden
- [ ] Mixed currencies are refused with an alert
- [ ] Stale data is badged with its age
- [ ] Four verification commands pass

**Definition of done.** For one week, `/performance` answers "which campaign produced qualified pipeline at what cost?" without a spreadsheet, with reconciliation visible.

**Deliverables.** `0009` migration, Meta client and transforms, ingest service and job, naming parser, reconciliation service, two performance surfaces, n8n schedule.

**Codex implementation order.** 1) migration → 2) client → 3) transform + fixtures → 4) ingest service + idempotency tests → 5) cron job → 6) naming parser → 7) reconciliation → 8) performance overview → 9) campaign table → 10) freshness badges → 11) n8n schedule.

---

## Phase 10 — Decision Engine & Today v2

**Overview.** The deterministic rule set from §29, its evidence trail, and the priority-ranked action list that completes the Today page.

**Objective.** Turn data into a ranked, explainable set of actions — and refuse to recommend when the data cannot support a recommendation.

**User value.** The user opens `/today` and sees the three to five things that matter, each with the numbers behind it.

**Scope.** Rule engine with versioned rules `R-00`–`R-10` · `rule_evaluations` · gate rules that suppress verdicts on stale or low-coverage data · priority scoring · Today priority-actions section · snooze and dismiss with reasons · threshold configuration in `/settings`.

**Out of scope.** AI recommendations, automatic campaign changes, per-creative verdicts, budget calculation, forecasting.

**Dependencies.** Phases 5, 8, 9.

### Functional requirements

| ID | Requirement |
|---|---|
| FR-10.1 | Every rule evaluation writes a `rule_evaluations` row including `SUPPRESSED` and `MONITOR` outcomes, so silence is explainable. |
| FR-10.2 | `R-00` runs first; when it fires, all campaign-scoped rules return `SUPPRESSED` and the surfaced action is "fix measurement", naming the stale source or coverage figure. |
| FR-10.3 | `R-01` blocks `SCALE_CANDIDATE` and `PAUSE_CANDIDATE` on insufficient sample but never blocks `INVESTIGATE`. |
| FR-10.4 | Rules `R-02`–`R-10` are implemented exactly as specified in §29.2 with thresholds from `app_settings`. |
| FR-10.5 | Every surfaced recommendation shows condition, evidence with actual numbers, comparison basis, window, verdict and stated limitations. |
| FR-10.6 | `/today` shows at most five priority actions ranked by the §29.3 score, with the score inputs visible on hover. |
| FR-10.7 | An action can be snoozed with a duration or dismissed with a reason; both persist and are reflected in the next evaluation. |
| FR-10.8 | An item dismissed three or more times within 30 days is flagged in `/settings` as a candidate rule change. |
| FR-10.9 | Thresholds are editable in `/settings` with validation, defaults and a reset control; changes are recorded with actor and timestamp. |
| FR-10.10 | Changing `rule_version` does not alter historical evaluations. |

**Non-functional.** NFR-10.1 Full daily evaluation across all campaigns completes in ≤ 30 s. NFR-10.2 Rules are pure functions of `(metrics, settings, clock)` with no I/O, so every rule is unit-testable with a fixture.

**Tools.** Supabase, Next.js cron endpoint, n8n schedule.

**Data model.** `rule_evaluations` (§15.2); `app_settings` gains the `rules.*`, `health.*` and `metrics.*` threshold groups.

**Tasks.**
- BE-10.1 Migration `0010_rule_evaluations`.
- BE-10.2 `domain/rules/` — one file per rule, a registry, a version constant, and a shared `RuleInput`/`RuleVerdict` type.
- BE-10.3 `domain/rules/priority.ts` — the scoring function with transparent inputs.
- BE-10.4 `services/decisions` — gather inputs, evaluate, persist, raise alerts for `CRITICAL` verdicts.
- BE-10.5 `/api/cron/evaluate-rules`.
- BE-10.6 Snooze/dismiss persistence and dismissal-frequency reporting.
- FE-10.1 Today priority-actions section with evidence disclosure.
- FE-10.2 Suppression banner explaining why recommendations are withheld.
- FE-10.3 `/settings` threshold editor grouped by rule with defaults and reset.
- FE-10.4 Rule-evaluation history view for a campaign.
- AUT-10.1 `WF-DECISION-EVAL` at 07:00 WIB.

**Routes.** `/today`, `/settings`, `/performance/meta` (evaluation history), `/api/cron/evaluate-rules`.

**User flow.** 07:00 rules run → the user opens `/today` → sees "Campaign X: spend 3× target CPQL with zero MQL — PAUSE CANDIDATE" with the numbers → opens the campaign → confirms → pauses it **in Meta** → records an experiment. Or: sees "Recommendations suppressed — Meta data is 31 hours stale" and fixes the pipeline instead.

**Edge cases.** A brand-new campaign with two days of data (`MONITOR` only) · a campaign with spend but no lead join (`R-06` fires before any quality verdict) · contradictory rules firing (a documented precedence order resolves it: gate → tracking → quality → scale) · all rules suppressed (Today explains why rather than showing an empty list) · a threshold set to an absurd value (validation bounds) · a snoozed item whose condition worsens materially (snooze is overridden and the change is stated).

**Error handling.** A failing rule is caught, recorded as an evaluation error, and does not abort the remaining rules. Missing inputs produce `SUPPRESSED`, never a guess.

**Security.** Threshold changes are audited. No rule may call an external write API — enforced by keeping `domain/rules` free of imports outside itself.

**Testing checklist.** `TEST-10.1` one fixture per rule, firing and not firing · `TEST-10.2` gate suppression cascade · `TEST-10.3` sample gate blocks scale/pause only · `TEST-10.4` precedence on contradictory conditions · `TEST-10.5` priority ordering · `TEST-10.6` snooze and dismiss behaviour · `TEST-10.7` evaluations written for suppressed outcomes · `TEST-10.8` E2E stale data → suppression banner.

**Acceptance criteria.**
- [ ] All eleven rules behave exactly as specified on fixtures
- [ ] Stale or low-coverage data suppresses verdicts with a stated reason
- [ ] Priority actions are ranked, capped at five, and show their evidence
- [ ] Every evaluation is recorded, including suppressions
- [ ] Thresholds are editable, validated and audited
- [ ] No rule can modify anything in an ad platform
- [ ] Four verification commands pass

**Definition of done.** For one week, the Today priority list is acted on or consciously dismissed, and no recommendation was made on data the system could not support.

**Deliverables.** `0010` migration, rule domain modules, priority scoring, decision service, cron job, Today v2, settings editor, evaluation history.

**Codex implementation order.** 1) migration → 2) rule types + registry → 3) rules one by one with fixtures → 4) priority scoring + tests → 5) decision service → 6) cron job → 7) Today section → 8) suppression banner → 9) settings editor → 10) evaluation history → 11) week-long observation.

---

## Phase 11 — Weekly Reporting

**Overview.** Assemble a weekly report from data already captured, let the user edit the narrative, then freeze it.

**Objective.** End the week in fifteen minutes, with a document that stays reproducible.

**User value.** A presentable report for the VP Marketing without re-typing numbers.

**Scope.** Weekly aggregation service · facts JSON assembly · editable draft · finalisation with an immutable snapshot and version · Markdown export and print-ready view · Slack "report ready" notification · mandatory data-quality caveats section.

**Out of scope.** AI-generated narrative, monthly and quarterly reports, scheduled email delivery, charts embedded in the export, external sharing links.

**Dependencies.** Phases 2, 4, 5, 9, 10.

### Functional requirements

| ID | Requirement |
|---|---|
| FR-11.1 | A weekly report can be generated for any ISO week (Monday–Sunday, Asia/Jakarta), past or current. |
| FR-11.2 | Generation assembles: metrics with previous-week comparison, completed and running experiments, workflow completion rate, notes for the period, unresolved alerts, and data-health status. |
| FR-11.3 | The facts JSON is the single input to rendering; the UI never recomputes a metric at display time. |
| FR-11.4 | The draft is editable in the narrative sections only; fact tables are read-only. |
| FR-11.5 | The data-quality caveats section is always present and states attribution coverage, outcome completeness, and any stale source in the period. |
| FR-11.6 | Finalising freezes `facts` and `narrative_md`, sets `finalized_at` and `finalized_by`, and makes the report immutable. |
| FR-11.7 | Regenerating a finalised week creates `version + 1`; it never mutates the existing row. |
| FR-11.8 | A finalised report exports as Markdown and renders in a print-ready layout. |
| FR-11.9 | Finalisation posts a Slack message with the report link and the headline metrics. |

**Non-functional.** NFR-11.1 Generation completes in ≤ 10 s for a week with 1,000 leads. NFR-11.2 A report finalised today renders identically in six months regardless of later data restatement.

**Tools.** Supabase, Next.js server functions, Slack via `WF-SLACK-SEND`.

**Data model.** `reports` (§15.2).

**Tasks.**
- BE-11.1 Migration `0011_reports`.
- BE-11.2 `services/reports/assemble.ts` — gather all inputs into a versioned facts schema validated by Zod.
- BE-11.3 Finalisation, versioning and immutability enforcement (a database-level guard, not only application logic).
- BE-11.4 Markdown exporter.
- BE-11.5 `/api/cron/weekly-report` for Monday pre-generation.
- FE-11.1 `/reports` list with status and period.
- FE-11.2 `/reports/[id]` draft editor with read-only fact tables and editable narrative.
- FE-11.3 Print-ready view and export control.
- AUT-11.1 `WF-WEEKLY-REPORT` Monday 07:30 plus manual trigger.

**Routes.** `/reports`, `/reports/[id]`, `/api/cron/weekly-report`.

**User flow.** Monday morning → a draft already exists → the user reviews the facts, writes three sentences of interpretation and next week's priorities → finalises → shares the export with the VP Marketing.

**Edge cases.** A week with no spend data · a week with zero leads (the report still generates and says so) · regenerating a week after HubSpot restated deals (new version; old version preserved) · the current, incomplete week (labelled partial) · a week spanning a month boundary · the first week ever, with no previous period to compare against.

**Error handling.** A missing input section renders as "not available" with the reason; it never blocks generation. An assembly failure leaves no partial report row.

**Security.** Reports may contain aggregate revenue but no contact PII. Exports are generated server-side and downloaded by the authenticated user; no public link.

**Testing checklist.** `TEST-11.1` assembly against a seeded week with hand-computed expected values · `TEST-11.2` immutability after finalisation (write attempt fails) · `TEST-11.3` versioning on regeneration · `TEST-11.4` caveats always present · `TEST-11.5` empty-week generation · `TEST-11.6` Markdown export structure · `TEST-11.7` E2E generate → edit → finalise → export.

**Acceptance criteria.**
- [ ] A weekly report generates with correct numbers on the fixture
- [ ] Narrative is editable; facts are not
- [ ] Finalised reports cannot be modified
- [ ] Regeneration creates a new version and preserves the old
- [ ] Caveats section always present with real figures
- [ ] Export is presentable without editing
- [ ] Four verification commands pass

**Definition of done.** Two consecutive real weekly reports produced in the app, each in under fifteen minutes of manual work.

**Deliverables.** `0011` migration, assembly service, versioning guard, exporter, report UI, n8n schedule.

**Codex implementation order.** 1) migration → 2) facts schema → 3) assembly + tests → 4) list/detail UI → 5) narrative editor → 6) finalisation + immutability → 7) exporter → 8) cron + Slack → 9) E2E.

---

## Phase 12 — Observability, Security Hardening & Production

**Overview.** Make the system safe to depend on: verified backups, an audited security posture, E2E coverage of critical paths, and a documented production cutover.

**Objective.** Move from "it works on my machine and my dev project" to "it is the system of record for daily operations".

**User value.** The user can trust the data, and can recover from a bad day.

**Scope.** Production Supabase project and migration path · full RLS audit script · security test suite from §32 · backup and restore drill · E2E critical paths · integration health page completion · runbook · performance index review · production deployment checklist.

**Out of scope.** New features of any kind. This phase adds no user-facing capability beyond `/integrations` completion.

**Dependencies.** All prior phases.

### Functional requirements

| ID | Requirement |
|---|---|
| FR-12.1 | An automated script asserts that every table in `public` has RLS enabled and at least one policy, and fails CI if not. |
| FR-12.2 | An automated check asserts that no service-role key, HubSpot token, Slack webhook or ingest secret appears in the client bundle or the repository. |
| FR-12.3 | All threat cases in §32 have an executable test or a signed-off manual checklist entry. |
| FR-12.4 | A backup restore drill is performed into a scratch project and documented with date, duration and outcome. |
| FR-12.5 | Playwright covers: login, daily checklist completion, manual lead creation and qualification, experiment lifecycle, report generation and finalisation, and one failure path per integration. |
| FR-12.6 | `/integrations` shows every integration with status, SLA, last run, last success, failure count, manual re-sync and recent errors. |
| FR-12.7 | A data-health self-check alerts when a scheduled check has not run within its own window. |
| FR-12.8 | `RUNBOOK.md` documents: rotating each secret, re-syncing each integration, restoring from backup, responding to each `CRITICAL` alert type, and the escalation path. |
| FR-12.9 | Production environment variables are configured separately from development; the environment badge proves which is in use. |
| FR-12.10 | Slow-query review is performed against production-like volume and any missing index is added by migration. |

**Non-functional.** NFR-12.1 All NFR-G1 targets verified against production-like data volume. NFR-12.2 Zero `CRITICAL` findings open at the gate. NFR-12.3 Deployment is repeatable from a documented checklist, not from memory.

**Tools.** Playwright, Supabase CLI, GitHub Actions, Vercel.

**Data model.** No new tables. Indexes may be added by migration based on measured slow queries.

**Tasks.**
- BE-12.1 RLS audit script, wired into CI.
- BE-12.2 Secret-leak scan of the build output and repository history, wired into CI.
- BE-12.3 Security test suite for the §32 threat cases.
- BE-12.4 Production Supabase project; apply all migrations from zero and verify.
- BE-12.5 Backup and restore drill; document it.
- BE-12.6 Slow-query review; add indexes by migration.
- FE-12.1 Complete `/integrations` (all integrations, SLA display, manual actions).
- FE-12.2 Global error boundary and a 404/500 page consistent with the shell.
- INT-12.1 Production deployment: environment variables, domain, HSTS, production n8n workflows pointed at production URLs and channels.
- INT-12.2 `RUNBOOK.md`.
- INT-12.3 Production cutover checklist executed and recorded.

**Routes.** `/integrations` (complete), error pages.

**User flow.** The user works in production with confidence; when something breaks, `/integrations` names it and the runbook says what to do.

**Edge cases.** A migration that behaves differently on an empty production database · production n8n still pointing at dev URLs (checklist item) · a secret rotated in one place but not another (runbook covers the full set) · a restore that succeeds but with stale sequences.

**Error handling.** Every unhandled error renders the branded error page with a correlation id the user can quote.

**Security.** The full §32 checklist is executed and signed off. Any open `CRITICAL` finding blocks the gate — no exceptions, no "fix it next sprint".

**Testing checklist.** `TEST-12.1` RLS audit passes · `TEST-12.2` secret scan clean · `TEST-12.3` forged signature rejected · `TEST-12.4` replay rejected · `TEST-12.5` anon read of `leads` denied · `TEST-12.6` six E2E critical paths green · `TEST-12.7` each integration's failure path renders a usable page · `TEST-12.8` restore drill documented.

**Acceptance criteria.**
- [ ] RLS audit and secret scan pass in CI
- [ ] All §32 threat cases tested or signed off
- [ ] Backup restored successfully in a drill, with evidence
- [ ] Six E2E paths green
- [ ] `/integrations` complete for every integration
- [ ] `RUNBOOK.md` covers rotation, re-sync, restore and every `CRITICAL` alert
- [ ] Production deployed, badge shows `PROD`, n8n points at production
- [ ] Four verification commands pass

**Definition of done.** PM OS is the system used for daily work in production, with a verified recovery path and no open critical security findings.

**Deliverables.** Audit scripts, security tests, E2E suite, production project and deployment, `RUNBOOK.md`, index migrations, cutover record.

**Codex implementation order.** 1) RLS audit → 2) secret scan → 3) security tests → 4) E2E suite → 5) integrations page completion → 6) error pages → 7) production project + migrations → 8) restore drill → 9) slow-query review → 10) runbook → 11) cutover.
---

## 36. Requirements Traceability Matrix

Status values: `Planned` · `In Progress` · `Implemented` · `Verified`. Codex updates this table at the end of every phase; a phase gate cannot pass while any of its requirements is below `Verified`.

| Requirement | Phase | Component | Test | Status |
|---|---|---|---|---|
| FR-0.1 | 0 | app scaffold | TEST-0.3 | Planned |
| FR-0.2 | 0 | `lib/env` | TEST-0.1 | Planned |
| FR-0.3 | 0 | `lib/env.server` | TEST-0.1 | Planned |
| FR-0.4 | 0 | package scripts | TEST-0.4 | Planned |
| FR-0.5 | 0 | CI workflow | TEST-0.4 | Planned |
| FR-0.6 | 0 | control docs | manual | Planned |
| FR-1.1 | 1 | auth actions | TEST-1.5 | Planned |
| FR-1.2 | 1 | middleware | TEST-1.1 | Planned |
| FR-1.3 | 1 | Supabase config | manual | Planned |
| FR-1.4 | 1 | `handle_new_user` | TEST-1.3 | Planned |
| FR-1.5 | 1 | auth actions | TEST-1.5 | Planned |
| FR-1.6 | 1 | app shell | TEST-1.5 | Planned |
| FR-1.7 | 1 | empty states | TEST-1.5 | Planned |
| FR-1.8 | 1 | settings service | TEST-1.4 | Planned |
| FR-1.9 | 1 | RLS policies | TEST-1.3 | Planned |
| FR-1.10 | 1 | topbar | TEST-1.5 | Planned |
| FR-2.1 | 2 | seed migration | TEST-2.2 | Planned |
| FR-2.2 | 2 | `services/workflows` | TEST-2.1 | Planned |
| FR-2.3 | 2 | checklist component | TEST-2.6 | Planned |
| FR-2.4 | 2 | checklist component | TEST-2.6 | Planned |
| FR-2.5 | 2 | `recomputeRunStatus` | TEST-2.4 | Planned |
| FR-2.6 | 2 | `workflow_items` | TEST-2.5 | Planned |
| FR-2.7 | 2 | template editor | TEST-2.6 | Planned |
| FR-2.8 | 2 | `services/workflows` | TEST-2.2 | Planned |
| FR-2.9 | 2 | `services/notes` | TEST-2.6 | Planned |
| FR-2.10 | 2 | `/workflows` | TEST-2.6 | Planned |
| FR-2.11 | 2 | `domain/dates` | TEST-2.3 | Planned |
| FR-3.1 | 3 | `services/playbook` | TEST-3.5 | Planned |
| FR-3.2 | 3 | slug generator | TEST-3.1 | Planned |
| FR-3.3 | 3 | markdown renderer | TEST-3.4 | Planned |
| FR-3.4 | 3 | search vector | TEST-3.2 | Planned |
| FR-3.5 | 3 | `/playbook` filters | TEST-3.5 | Planned |
| FR-3.6 | 3 | publish action | TEST-3.3 | Planned |
| FR-3.7 | 3 | search filter | TEST-3.3 | Planned |
| FR-3.8 | 3 | seed migration | manual | Planned |
| FR-4.1 | 4 | experiment form | TEST-4.6 | Planned |
| FR-4.2 | 4 | code generator | TEST-4.2 | Planned |
| FR-4.3 | 4 | `domain/experiments/state` | TEST-4.1 | Planned |
| FR-4.4 | 4 | completion dialog | TEST-4.3 | Planned |
| FR-4.5 | 4 | duration guardrail | TEST-4.5 | Planned |
| FR-4.6 | 4 | sample guardrail | TEST-4.5 | Planned |
| FR-4.7 | 4 | priority score | TEST-4.4 | Planned |
| FR-4.8 | 4 | running view | TEST-4.6 | Planned |
| FR-4.9 | 4 | learning search | TEST-4.6 | Planned |
| FR-4.10 | 4 | Today section | TEST-4.6 | Planned |
| FR-4.11 | 4 | `external_refs` schema | TEST-4.1 | Planned |
| FR-5.1 | 5 | `/leads/new` | TEST-5.10 | Planned |
| FR-5.2 | 5 | `services/leads` resolve | TEST-5.4 | Planned |
| FR-5.3 | 5 | lead service | TEST-5.1 | Planned |
| FR-5.4 | 5 | dedupe key | TEST-5.3 | Planned |
| FR-5.5 | 5 | `domain/qualification` | TEST-5.1 | Planned |
| FR-5.6 | 5 | settings loader | TEST-5.1 | Planned |
| FR-5.7 | 5 | override dialog | TEST-5.5 | Planned |
| FR-5.8 | 5 | `lead_stage_events` | TEST-5.5 | Planned |
| FR-5.9 | 5 | CSV import | TEST-5.8 | Planned |
| FR-5.10 | 5 | CSV import | TEST-5.8 | Planned |
| FR-5.11 | 5 | `/leads` table | TEST-5.10 | Planned |
| FR-5.12 | 5 | `/leads/[id]` | TEST-5.10 | Planned |
| FR-5.13 | 5 | `services/deals` | TEST-5.6 | Planned |
| FR-5.14 | 5 | `/funnel` + views | TEST-5.6, 5.7 | Planned |
| FR-5.15 | 5 | metric formatter | TEST-5.9 | Planned |
| FR-5.16 | 5 | Today queue | TEST-5.10 | Planned |
| FR-6.1 | 6 | ingest route | TEST-6.1 | Planned |
| FR-6.2 | 6 | `lib/http/hmac` | TEST-6.2 | Planned |
| FR-6.3 | 6 | replay window | TEST-6.3 | Planned |
| FR-6.4 | 6 | idempotency lib | TEST-6.4 | Planned |
| FR-6.5 | 6 | shared lead service | TEST-6.5 | Planned |
| FR-6.6 | 6 | `webhook_events`, runs | TEST-6.9 | Planned |
| FR-6.7 | 6 | payload guard | TEST-6.6 | Planned |
| FR-6.8 | 6 | cron dispatcher | TEST-6.7, 6.8 | Planned |
| FR-6.9 | 6 | `/integrations` | TEST-6.9 | Planned |
| FR-6.10 | 6 | `WF-LEAD-RELAY` | manual + TEST-6.5 | Planned |
| FR-6.11 | 6 | `WF-ERROR` | manual | Planned |
| FR-7.1 | 7 | HubSpot client | TEST-7.9 | Planned |
| FR-7.2 | 7 | mapping loader | TEST-7.2 | Planned |
| FR-7.3 | 7 | mapping loader | TEST-7.3 | Planned |
| FR-7.4 | 7 | crm-sync upsert | TEST-7.1 | Planned |
| FR-7.5 | 7 | write-back service | TEST-7.8 | Planned |
| FR-7.6 | 7 | write-back service | TEST-7.8 | Planned |
| FR-7.7 | 7 | HubSpot webhook route | TEST-7.5 | Planned |
| FR-7.8 | 7 | reconcile job | TEST-7.4 | Planned |
| FR-7.9 | 7 | stage event writer | TEST-7.6 | Planned |
| FR-7.10 | 7 | deal linkage | TEST-7.6 | Planned |
| FR-7.11 | 7 | resolution guard | TEST-7.7 | Planned |
| FR-7.12 | 7 | `/integrations/hubspot` | TEST-7.10 | Planned |
| FR-7.13 | 7 | attribution service | TEST-7.6 | Planned |
| FR-8.1 | 8 | `domain/alerts/keys` | TEST-8.1, 8.2 | Planned |
| FR-8.2 | 8 | alert service | TEST-8.3 | Planned |
| FR-8.3 | 8 | auto-resolve sweep | TEST-8.3 | Planned |
| FR-8.4 | 8 | dispatcher policy | TEST-8.4 | Planned |
| FR-8.5 | 8 | dispatcher policy | TEST-8.4 | Planned |
| FR-8.6 | 8 | digest collapse | TEST-8.5 | Planned |
| FR-8.7 | 8 | quiet hours | TEST-8.6 | Planned |
| FR-8.8 | 8 | Slack serialiser | TEST-8.7 | Planned |
| FR-8.9 | 8 | Today alert section | TEST-8.3 | Planned |
| FR-8.10 | 8 | alert→playbook link | manual | Planned |
| FR-8.11 | 8 | delivery failure path | TEST-8.8 | Planned |
| FR-9.1 | 9 | `ad_accounts` | TEST-9.4 | Planned |
| FR-9.2 | 9 | ingest job | TEST-9.2 | Planned |
| FR-9.3 | 9 | `ad_metrics_daily` | TEST-9.2 | Planned |
| FR-9.4 | 9 | currency guard | TEST-9.3 | Planned |
| FR-9.5 | 9 | `config/integrations` | manual | Planned |
| FR-9.6 | 9 | token expiry check | TEST-9.8 | Planned |
| FR-9.7 | 9 | `/performance` | TEST-9.6 | Planned |
| FR-9.8 | 9 | `/performance/meta` | TEST-9.6 | Planned |
| FR-9.9 | 9 | reconciliation service | TEST-9.6 | Planned |
| FR-9.10 | 9 | freshness badge | TEST-9.7 | Planned |
| FR-9.11 | 9 | naming parser | TEST-9.5 | Planned |
| FR-9.12 | 9 | manual re-ingest | manual | Planned |
| FR-10.1 | 10 | `rule_evaluations` | TEST-10.7 | Planned |
| FR-10.2 | 10 | gate rule R-00 | TEST-10.2 | Planned |
| FR-10.3 | 10 | sample rule R-01 | TEST-10.3 | Planned |
| FR-10.4 | 10 | `domain/rules/*` | TEST-10.1 | Planned |
| FR-10.5 | 10 | evidence renderer | TEST-10.1 | Planned |
| FR-10.6 | 10 | priority section | TEST-10.5 | Planned |
| FR-10.7 | 10 | snooze/dismiss | TEST-10.6 | Planned |
| FR-10.8 | 10 | dismissal report | TEST-10.6 | Planned |
| FR-10.9 | 10 | settings editor | TEST-10.1 | Planned |
| FR-10.10 | 10 | rule versioning | TEST-10.7 | Planned |
| FR-11.1 | 11 | assembly service | TEST-11.1 | Planned |
| FR-11.2 | 11 | assembly service | TEST-11.1 | Planned |
| FR-11.3 | 11 | facts schema | TEST-11.1 | Planned |
| FR-11.4 | 11 | draft editor | TEST-11.7 | Planned |
| FR-11.5 | 11 | caveats section | TEST-11.4 | Planned |
| FR-11.6 | 11 | finalisation guard | TEST-11.2 | Planned |
| FR-11.7 | 11 | versioning | TEST-11.3 | Planned |
| FR-11.8 | 11 | exporter | TEST-11.6 | Planned |
| FR-11.9 | 11 | Slack notify | TEST-11.7 | Planned |
| FR-12.1 | 12 | RLS audit script | TEST-12.1 | Planned |
| FR-12.2 | 12 | secret scan | TEST-12.2 | Planned |
| FR-12.3 | 12 | security suite | TEST-12.3–12.5 | Planned |
| FR-12.4 | 12 | restore drill | TEST-12.8 | Planned |
| FR-12.5 | 12 | E2E suite | TEST-12.6 | Planned |
| FR-12.6 | 12 | `/integrations` | TEST-12.7 | Planned |
| FR-12.7 | 12 | health self-check | TEST-12.7 | Planned |
| FR-12.8 | 12 | `RUNBOOK.md` | manual | Planned |
| FR-12.9 | 12 | env separation | manual | Planned |
| FR-12.10 | 12 | index migration | manual | Planned |

---

## 37. Deployment Strategy

| Environment | App | Database | n8n | Slack channel | Purpose |
|---|---|---|---|---|---|
| Local | `npm run dev` | Supabase dev project | local or dev n8n | `#pm-alerts-dev` | Development |
| Development | Vercel preview per PR | Supabase dev project | dev n8n workflows | `#pm-alerts-dev` | Review |
| Production | Vercel production | **Separate Supabase production project** | production n8n workflows | `#pm-alerts` | Daily operation |

Rules:
1. Production Supabase is created at Phase 12, not earlier. Real lead PII never lives in the development project. If production data is ever needed for debugging, it is anonymised first.
2. Migrations are applied forward-only through the Supabase CLI, in order, from an empty database. The ability to build production from zero migrations is verified in Phase 12.
3. Deployment is triggered from `main` after CI passes. No manual deploys from a laptop.
4. Rollback plan: revert the commit and redeploy. **Schema migrations are forward-only** — a schema mistake is fixed with a new migration, never by rolling the database back under a running application.
5. n8n production workflows are separate from development workflows and point at production URLs, production credentials and the production Slack channel. Verifying this is an explicit item on the cutover checklist, because it is the single most common production incident in this architecture.

---

## 38. Environment Configuration

`.env.example` contains names and comments only, never values.

```bash
# ---- Public (browser-visible; never put a secret here) ----
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_ENV=                 # development | production — drives the environment badge

# ---- Core server ----
SUPABASE_SERVICE_ROLE_KEY=           # server only, never NEXT_PUBLIC_
APP_BASE_URL=                        # absolute, used to build deep links
APP_TIMEZONE=Asia/Jakarta            # business timezone; do not derive from the server clock

# ---- Machine-to-machine auth ----
INGEST_HMAC_SECRET=                  # signs /api/ingest/*
INGEST_HMAC_SECRET_PREVIOUS=         # optional, valid during a rotation window
CRON_SECRET=                         # bearer token for /api/cron/*

# ---- Phase 7: HubSpot ----
HUBSPOT_ACCESS_TOKEN=                # private app, minimum scopes
HUBSPOT_WEBHOOK_SECRET=
HUBSPOT_PORTAL_ID=                   # used to build record deep links

# ---- Phase 8: Slack ----
SLACK_WEBHOOK_URL=

# ---- Phase 9: Meta ----
META_AD_ACCOUNT_ID=
META_ACCESS_TOKEN=                   # ads_read only
META_API_VERSION=                    # pinned; record the verification date in DECISIONS.md

# ---- Later phases ----
# GA4_PROPERTY_ID=
# GOOGLE_ADS_CUSTOMER_ID=
```

Rules: every variable is declared in `lib/env.ts` (public) or `lib/env.server.ts` (server) with a Zod schema and a phase annotation. A variable required by a phase that has not been built yet is optional until that phase. Secrets are rotated through the runbook, and `INGEST_HMAC_SECRET_PREVIOUS` exists so rotation does not drop in-flight leads.

---

## 39. Codex Development Protocol

### 39.1 Standing rules

1. **Read this document before changing architecture.** If a change contradicts it, stop and ask; do not implement and explain afterwards.
2. **One phase at a time.** Do not implement a later phase's functionality because it "would be easy now".
3. **Do not invent requirements.** If something is missing, document the gap in `DECISIONS.md` and ask.
4. **Do not silently change architecture.** Any deviation is recorded in `DECISIONS.md` with its reason before the code lands.
5. **Do not add a dependency, table or abstraction** without a `DECISIONS.md` entry.
6. **Prefer the simplest implementation that satisfies the requirement.** Cleverness that is not required is technical debt with better PR.
7. **Strict TypeScript.** No `any` without an adjacent `// why:` comment.
8. **Domain logic never lives in a React component.**
9. **Integrations stay behind service modules.** No `fetch` to an external API from a page or component.
10. **Validate every external input with Zod** at the boundary.
11. **Never expose a secret client-side.** Never log PII or tokens.
12. **Schema changes only via migrations.** Never edit an applied migration.
13. **RLS on every new table, in the same migration.**
14. **Tests accompany the feature**, not a later cleanup pass. Domain logic requires unit tests before the UI is built.
15. **Run `lint`, `typecheck`, `test`, `build`** before declaring anything complete.
16. **When a requirement is ambiguous: STOP and document the ambiguity.** Do not guess. A guess that ships becomes a fact nobody remembers deciding.

### 39.2 Task prompt template

```
TASK: <one phase item>

Read: PRD.md §<sections>, DATA_MODEL.md, AGENTS.md
Scope: <explicit list of what to build>
Out of scope: <explicit list of what NOT to touch>
Acceptance criteria: <copy from the phase>
Verification: npm run lint && npm run typecheck && npm test && npm run build
Do not modify unrelated modules.
```

### 39.3 Phase completion report (required at the end of every phase)

```
PHASE <n> — <name>
Implemented:            <requirement IDs, one line each>
Files changed:          <paths>
Migrations:             <filenames, applied yes/no>
Tests added:            <test IDs, pass/fail>
Verification:           lint ✓/✗  typecheck ✓/✗  tests ✓/✗  build ✓/✗
Deviations from PRD:    <none | list with reason and DECISIONS.md ref>
Unresolved issues:      <list, with impact>
Traceability updated:   yes/no
Recommended next:       <action>
PHASE <n> STATUS: PASS / FAIL
```

### 39.4 Phase gate

A phase is `PASS` only when **all** of the following hold:

- [ ] Every functional requirement in the phase is implemented
- [ ] Every acceptance-criteria checkbox is ticked with evidence
- [ ] Migrations apply cleanly from an empty database
- [ ] RLS is enabled with policies on every new table
- [ ] Tests in the phase checklist pass
- [ ] `lint`, `typecheck`, `test`, `build` all pass
- [ ] Traceability matrix updated to `Verified` for the phase's requirements
- [ ] `DECISIONS.md` updated for any deviation
- [ ] No open `CRITICAL` issue
- [ ] `TASKS.md` updated with what remains

**Codex does not begin phase N+1 until explicitly instructed.** A `FAIL` result is a normal outcome and is reported plainly with what is missing, never worked around.

---

## 40. Future Roadmap

Ordered by expected value, not by novelty. Nothing here is permitted to complicate the MVP architecture.

| Item | Prerequisite | Why it is deferred |
|---|---|---|
| Google Ads connector | Phase 9 | Schema is already platform-agnostic; this is an adapter, not a redesign. **Likely the first post-MVP item given where the intent-based spend actually sits.** |
| GA4 / GTM website metrics | Verified LP tracking contract | No daily decision depends on it until landing-page instrumentation is trustworthy |
| Ad-level granularity + creative dimensions | Phase 9 + naming compliance above threshold | Parsing unreliable names produces confident nonsense |
| Offline conversion upload (won deals → ad platform) | Phase 7 with reliable outcome completeness | Uploading incomplete outcomes trains the platform on a lie |
| AI narrative drafting for reports | Phase 11 | Facts JSON is already the right input shape |
| AI copilot over the operational record | Phases 10–11 | Needs a trustworthy record first, which is the entire point of Phases 0–12 |
| WhatsApp conversation SLA metrics | WhatsApp API decision resolved | Depends on an external platform choice |
| Multi-touch attribution | Sustained multi-channel volume | First/last touch is honest at current volume; multi-touch on thin data is decoration |
| Role-based views (Sales, Lead, Management) | A second user actually exists | `profiles.role` and the `can()` helper already anticipate it |
| Approval workflow for campaign changes | A team, not a solo operator | — |
| Automatic playbook retrieval from alert type | Phase 8 + a matured playbook | Manual linking already covers most of the value |
| LinkedIn / TikTok connectors | Active spend on those platforms | — |
| Budget pacing and forecast scenarios | Phase 9 + at least one quarter of data | Forecasting on a quarter of noise is astrology |
| Autonomous optimisation | Everything above, plus a track record of correct advisory verdicts | Permanently gated behind explicit human approval |

---

## Appendix A — External Preconditions (not built by this application)

These are dependencies on other systems and other people. Each one blocks a specific phase, and none of them is solved by writing code in this repository. Track them outside the phase plan and confirm before starting the dependent phase.

| # | Precondition | Blocks | Owner | Notes |
|---|---|---|---|---|
| A1 | HubSpot custom properties of §19.2 created with the exact internal names | Phase 7 | CRM admin | Renaming later breaks the mapping loudly, by design |
| A2 | HubSpot private app token issued with minimum scopes; pipeline and stage ids recorded | Phase 7 | CRM admin | Record in `app_settings`, not in code |
| A3 | Agreement on **who** completes Closed Won/Lost and within what SLA | Phase 7, and all revenue metrics | Sales / VP Marketing | The single most consequential dependency outside the builder's control. Without it, ROAS and CAC are decoration and `R-09` will suppress them. |
| A4 | Slack workspace app + two channels (prod, dev) with webhook URLs | Phase 8 | Workspace admin | — |
| A5 | Meta system user token with `ads_read`; ad account currency and timezone confirmed | Phase 9 | Ads admin | Confirm currency is IDR or accept the mixed-currency refusal |
| A6 | UTM convention published and enforced on every ad and link | Phase 5 onward | Marketing | Attribution coverage depends on it entirely; document it as a Playbook reference article |
| A7 | Campaign / ad naming convention (§23.5) adopted in the ad account | Phase 9 | Marketing | Compliance percentage is measured, not assumed |
| A8 | Landing pages emit the §23.2 payload on submit (including click ids) | Phase 6 | LP developer | Static HTML + Apps Script stack; PM OS defines only the contract |
| A9 | **WhatsApp API configuration decided** (Cloud API vs BSP vs App) determining whether `ctwa_clid` is obtainable | Phase 6 deterministic CTWA attribution | External / vendor | Degraded mode (§23.4) works regardless, but campaign-level CTWA CPQL is impossible without it |
| A10 | n8n instance hardened: HTTPS, auth, backups, restricted ports | Phase 6 | Builder | Existing VPS is acceptable once hardened |
| A11 | Target CPQL agreed from average deal value and margin | Phase 10 (`R-02`, `R-05`) | VP Marketing | A kill rule with a guessed threshold kills the wrong campaigns |

---

## Appendix B — Open Questions (require a business decision, not a technical one)

1. **Target CPQL and target CPL.** What are they, derived from average deal value, gross margin and the MQL→won rate? Rules `R-02` and `R-05` are inert until this number exists. *(Blocks Phase 10.)*
2. **First connector priority.** Meta is specified for Phase 9 because CTWA is already live and the API path is known. If the majority of intent-based spend sits on Google Search, building the Google Ads connector first may deliver more value. **Recommendation:** build Meta first (shorter path, existing flow), Google Ads immediately after as the first post-MVP item — unless Google spend exceeds Meta spend by more than 2×, in which case swap them. *(Affects Phase 9 only; the schema is unaffected either way.)*
3. **SQL ownership.** Confirmed that SQL and everything downstream is decided in HubSpot by sales, with PM OS mirroring only? If in practice the marketing specialist sets SQL, the write-back flag and the data-ownership matrix both change. *(Blocks Phase 7 write-back configuration.)*
4. **Stale-lead SLA.** Default is 2 workdays for MQL and 3 for SQL. Is that the agreed expectation with whoever handles WhatsApp conversations? *(Affects alert volume from Phase 8.)*
5. **Lifecycle write-back.** Should PM OS set HubSpot lifecycle stage to MQL automatically, or only record its reason and leave the stage to a human? Default is **off**. *(Phase 7.)*
6. **Report audience and format.** Is Markdown plus a print view sufficient for the VP Marketing, or is a Google Doc / Slides deliverable expected? *(Phase 11 export scope.)*
7. **Second user horizon.** Will Marketing Lead or Sales get access within six months? If yes, role enforcement moves from Future into Phase 12; if no, it stays deferred. *(Affects Phase 12 scope only.)*
8. **Data retention for leads.** How long is lead PII retained after a lost deal? The default proposal is "while commercially relevant, reviewed annually" — a definite period is better. *(Affects §32 retention policy.)*

---

## Appendix C — Glossary

| Term | Meaning in this document |
|---|---|
| **Lead** | One inquiry event. A person who inquires twice produces two leads and one contact. |
| **Contact** | A person. Mirrors a HubSpot Contact. |
| **MQL** | A lead that satisfies the deterministic qualification rules in §26.3. Decided by PM OS. |
| **SQL** | A lead accepted by sales. Decided in HubSpot, mirrored by PM OS. |
| **CPQL** | Spend ÷ MQL. The primary optimisation metric. |
| **CPL** | Spend ÷ leads. Diagnostic only — never an optimisation target. |
| **Cohort basis** | Outcomes counted against the date the lead was acquired. |
| **Activity basis** | Events counted against the date they occurred. |
| **Attribution coverage** | Share of leads with a resolvable campaign. Gate for optimisation verdicts. |
| **Outcome completeness** | Share of past-due deals marked won or lost. Gate for revenue verdicts. |
| **Verdict** | A decision-engine output: MONITOR, INVESTIGATE, HOLD, SCALE_CANDIDATE, PAUSE_CANDIDATE, SUPPRESSED. |
| **Phase gate** | The checklist that must pass before the next phase begins. |
| **WIB** | Waktu Indonesia Barat, UTC+7, `Asia/Jakarta`. The business timezone for every date in this system. |

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Sep 2026 | Initial PRD and technical blueprint |
| 2.0 | Sep 2026 | Implementation-ready rewrite: 138 testable requirement IDs across 13 phases; lead grain corrected to inquiry-level (AD-01); `lead_attributions` removed in favour of first-touch-on-contact / last-touch-on-lead (AD-02); `campaign_daily` replaced by platform-agnostic `ad_metrics_daily` (AD-03); business logic centralised in the app with n8n reduced to transport (AD-04); cohort vs activity basis made explicit and `funnel_daily` converted to views (AD-05); single lead ingestion path defined; qualification rules and decision rules specified concretely and versioned; timezone, currency and B2B-lag semantics defined; CTWA treated as a first-class source with a degraded mode; `contacts`, `lead_stage_events`, `webhook_events`, `sync_state`, `ad_accounts`, `rule_evaluations`, `reports` added; phases resequenced (n8n foundation before HubSpot; alerts separated from Slack); per-phase acceptance criteria, testing checklists, definitions of done and phase gates added; traceability matrix, external preconditions and open questions added. |

**END OF VERSION 2.0**
