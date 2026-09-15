# DU ANYAM — PERFORMANCE MARKETING OS

**Master Product Requirements Document, Technical Blueprint & Development Protocol**

| | |
|---|---|
| Version | **3.0** (supersedes v2.0; v1.0 September 2026) |
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

PM OS is not a dashboard, not a CRM, and not an ad manager. It is the **operating layer, analytics layer, and decision layer** that sits on top of systems that already own their data: HubSpot owns CRM truth, ad platforms own spend truth, Slack carries alerts. PM OS itself owns every business rule.

The product is deliberately **manual-first**. Phases 2–5 deliver a system that is useful with zero external integrations. Integrations increase leverage; they never determine whether the product works.

### 1.1 Version history in one paragraph

v1.0 was a strong strategic outline that could not be implemented without guessing. v2.0 added testable requirement IDs, a corrected data model, a single ingestion path, defined qualification and decision rules, timezone and currency semantics, and a phase-gate protocol. **v3.0 removes n8n from the runtime architecture entirely** (it becomes an optional future orchestration layer, §21.5), **moves the UI foundation to Phase 1** so the application is visually navigable before any integration exists, moves authentication to Phase 2, and resequences everything into fourteen phases built as full-stack vertical slices on top of that UI foundation. See `AUDIT_REPORT_v3.md` for the change list and rationale.

### 1.2 The two rules that shape everything else

1. **All business logic lives in the PM OS application.** Qualification, attribution, funnel maths, KPI formulas, decision rules, deduplication and CRM ownership rules are implemented once, in the domain layer, and never in an external workflow tool. No external system is ever a prerequisite for a business rule to be correct.
2. **The frontend system comes before the features.** Phase 1 builds the design system and the full route skeleton with honest empty states. Every later phase activates one section of an interface that already exists, as a vertical slice from database to UI.

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

### 7.1 MVP Core — usable with zero external integrations (Phases 0–6)

Project foundation · design system and full route skeleton · authentication and RLS · daily workflow and checklist engine · Today v1 · Playbook/SOP · Experiment OS · contact/company/lead/deal model with manual entry and CSV import · qualification engine · funnel views with cohort and activity semantics.

At the end of Phase 6 the product is genuinely useful every day: the operator runs their checklist, records experiments and learnings, registers and qualifies every inquiry by hand or by import, and reads a correct funnel — with nothing connected.

### 7.2 MVP Integration — the first integrated release (Phases 7–10)

Integration and background-job foundation (signed ingest, idempotency, retry, sync state, scheduled jobs, integration health) · HubSpot CRM synchronisation · alert domain with Slack as its first transport · Meta Ads ingest and the performance surfaces.

### 7.3 Post-MVP — valuable, but safe to wait (Phases 11–13)

Deterministic decision engine and Today v2 priority actions · weekly reporting with immutable snapshots · production hardening. Phases 11–13 are numbered and specified here because they are planned work with real dependencies, not because they belong in the first release.

### 7.4 Deferred — specified only as intent

GA4 / GTM website metrics · Google Ads connector · ad-level (adset/ad) granularity with creative-naming parsing · offline conversion upload · monthly reporting and cohort analysis · role-based views · **n8n as an optional orchestration layer (§21.5)**.

### 7.5 Future

AI copilot over the structured record · WhatsApp conversation SLA metrics · Creative intelligence (angle/hook/visual performance) · Predictive pacing and forecasting · LinkedIn & TikTok connectors · Multi-touch attribution · Approval workflows · Autonomous optimisation (explicitly gated behind human approval).

### 7.6 Scope guard

A feature enters MVP only if removing it would make a **daily** job impossible. Anything used weekly or less starts as a manual procedure documented in the Playbook.

---

## 8. Functional Requirements — Global Index

Requirements are specified in full inside each phase (Section 35) with IDs `FR-<phase>.<n>`. This index exists so a reader can locate a capability without reading every phase.

| Capability area | Phase | Requirement range |
|---|---|---|
| Project foundation, env validation, CI | 0 | FR-0.1 – FR-0.6 |
| Design system, app shell, route skeleton, page states | 1 | FR-1.1 – FR-1.12 |
| Authentication, RLS baseline, settings, route protection | 2 | FR-2.1 – FR-2.10 |
| Daily workflow, checklist, notes, Today v1 | 3 | FR-3.1 – FR-3.11 |
| Playbook & SOP | 4 | FR-4.1 – FR-4.8 |
| Experiment OS | 5 | FR-5.1 – FR-5.11 |
| Lead / contact / company / deal, funnel, qualification | 6 | FR-6.1 – FR-6.16 |
| Ingest API, webhook safety, retry, scheduled jobs | 7 | FR-7.1 – FR-7.14 |
| HubSpot integration | 8 | FR-8.1 – FR-8.13 |
| Alert domain & Slack notifications | 9 | FR-9.1 – FR-9.12 |
| Meta Ads ingest & performance surfaces | 10 | FR-10.1 – FR-10.12 |
| Decision engine & Today v2 | 11 | FR-11.1 – FR-11.10 |
| Reporting | 12 | FR-12.1 – FR-12.9 |
| Observability, hardening, production | 13 | FR-13.1 – FR-13.10 |

---

## 9. Non-Functional Requirements (global)

These apply to every phase. Phase-specific NFRs are additive, never contradictory.

| ID | Category | Requirement | Verification |
|---|---|---|---|
| NFR-G1 | Performance | Any authenticated page renders first meaningful content ≤ 2.0 s on a 10 Mbps connection with warm cache; server data functions complete ≤ 800 ms p95 for datasets up to 50k leads / 200k metric rows. | Manual timing + query `EXPLAIN ANALYZE` on the largest tables. |
| NFR-G2 | Reliability | No unhandled promise rejection or uncaught exception may render a blank page. Every route has an error boundary and a loading state. | E2E failure tests. |
| NFR-G3 | Availability semantics | The app must remain usable when HubSpot, Slack or Meta are down, and when every scheduled job is failing. Upstream failure shows a degraded state, never a crash. | Integration kill-switch test (Phase 13). |
| NFR-G4 | Security | No secret is ever exposed to the browser. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be public. RLS enabled on every table in `public`. | `grep` in build output + RLS audit script. |
| NFR-G5 | Privacy | Lead PII (name, email, phone, message) is never written to application logs, Slack messages, job logs, or error trackers. Slack carries identifiers and links, not personal data. | Log review checklist per phase. |
| NFR-G6 | Data integrity | Every externally-sourced row carries `external_id`, `source_system`, `source_updated_at`, `synced_at`. Every write from an integration is idempotent. | Replay test: same payload twice → one row. |
| NFR-G7 | Maintainability | Strict TypeScript, no `any` without an adjacent `// why:` comment, domain logic isolated from React components, integrations behind service modules. | `tsc --noEmit`, lint rule, code review. |
| NFR-G8 | Accessibility | Keyboard-operable navigation; status never conveyed by colour alone (icon + text label); form fields have labels; visible focus states; contrast ≥ 4.5:1 for text. Established once in the Phase 1 design system so later phases inherit it rather than retrofitting it. | Axe pass on `/today`, `/leads`, `/experiments`. |
| NFR-G9 | Observability | Every integration execution writes an `integration_runs` row with a `correlation_id`. Every rule evaluation writes a `rule_evaluations` row. | Query check per phase. |
| NFR-G10 | Time correctness | All timestamps stored as `timestamptz` in UTC. All business dates computed in `Asia/Jakarta`. No naive date arithmetic in application code. | Unit tests on the date utility, including DST-free UTC+7 boundaries and month edges. |
| NFR-G11 | Portability | No vendor lock-in beyond Supabase (Postgres) and Vercel (standard Next.js). Scheduling is a thin trigger over HTTP endpoints, so the scheduler can be swapped (Vercel Cron → GitHub Actions → `pg_cron` → n8n) without touching job logic. No Postgres extension beyond `pgcrypto` and `citext`. | Dependency review. |
| NFR-G12 | Auditability | Any change to thresholds, qualification rules or a lead's stage is recorded with actor and timestamp. | `lead_stage_events`, `app_settings.updated_by`. |

---

## 10. System Architecture

```
  Landing pages / forms     WhatsApp (CTWA)      HubSpot CRM        Meta Ads API      Scheduler
  (static HTML + GAS)       gateway / manual     (system of record) (read only)       (Vercel Cron)
          │                        │                   │  ▲                │               │
          │ signed HTTPS           │ signed HTTPS      │  │ upsert         │ pull          │ Bearer
          │ (server-side)          │                   │  │ (ingest only)  │               │ CRON_SECRET
          ▼                        ▼                   ▼  │                │               ▼
    ┌──────────────────────────────────────────────────────────────────────────────────────────┐
    │                          Next.js (App Router) — PM OS                                     │
    │                                                                                            │
    │  Route handlers        /api/ingest/lead · /api/ingest/hubspot · /api/jobs/[job]             │
    │        ▼                                                                                   │
    │  Integration layer     hubspot/ · meta/ · slack/        ── outbound ──►  Slack #pm-alerts   │
    │        ▼                                                                                   │
    │  Service layer         leads · crm-sync · alerts · reports · jobs                           │
    │        ▼                                                                                   │
    │  Domain layer          qualification · metrics · rules · attribution · dates  (no I/O)      │
    │        ▼                                                                                   │
    │  Repository layer      the only code that talks to Supabase                                 │
    │        ▼                                                                                   │
    │  UI                    server components + design system (Phase 1)                          │
    └───────────────┬────────────────────────────────────────────────────────────────────────────┘
                    │ supabase-js (server: service role · browser: anon + RLS)
                    ▼
    ┌───────────────────────────────────────────────┐
    │  Supabase Postgres + Auth                      │
    │  operational state · mirrors · analytics views │
    └───────────────────────────────────────────────┘
```

Every arrow into PM OS terminates at a route handler that validates, authenticates and logs before any business code runs. There is no middleware system between an external source and the application, and no component of the runtime lives outside this repository.

### 10.1 Responsibility boundaries

| System | Owns | Must never do |
|---|---|---|
| **HubSpot** | Contact, Company, Deal, lifecycle stage, deal stage, owner, revenue | — |
| **Ad platforms** | Spend, impressions, clicks, platform-reported results | — |
| **Supabase** | Workflow runs, playbook, experiments, alerts, rule evaluations, reports, mirrors of the above, derived analytics | Become a second CRM writer of stage/owner data |
| **Next.js (PM OS)** | **Everything else**: ingest, validation, deduplication, qualification, attribution, KPI computation, decision rules, sync orchestration, retry, scheduling logic, alerting, reporting | Hold secrets client-side |
| **Scheduler (Vercel Cron)** | Calling `/api/jobs/[job]` on a schedule, with a bearer token | Contain any logic whatsoever. It is a clock, not a component. |
| **Slack** | Human notification and coordination | Hold state that is not also in PM OS or HubSpot |

> **AD-04 (binding, strengthened in v3.0).** Business logic lives in **one** place: the PM OS domain layer, in this repository, under version control and test. No workflow tool, no database function, no external automation platform implements or duplicates a business rule. The practical test: deleting every external system except Supabase must leave every rule intact and every test passing.

> **AD-15 (v3.0).** **n8n is not part of the runtime.** Its former responsibilities — relay, retry, scheduling, fan-out, digests, correlation ids — are now owned by PM OS: route handlers receive, a retry queue in `webhook_events` recovers, `/api/jobs/[job]` plus a scheduler drives cadence, and the integration layer sends outbound. n8n remains documented as an **optional future orchestration layer** (§21.5) that would sit *in front of* these same endpoints, never inside them.

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
| Hosting | Vercel (app), Supabase (db + auth) | — | Two managed services, no self-hosted runtime component |
| Scheduling | **Vercel Cron** declared in `vercel.json`, calling `/api/jobs/[job]` with a bearer token | — | Native to the host, no extra service. If the plan's cron frequency is insufficient (see Appendix A), the documented fallbacks are a GitHub Actions scheduled workflow or `pg_cron` + `pg_net` — both call the same endpoints, so the swap touches configuration only |

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
│       ├── ingest/lead/route.ts      signed inbound leads (Phase 7)
│       ├── ingest/hubspot/route.ts   HubSpot webhook receiver (Phase 8)
│       ├── jobs/[job]/route.ts       scheduled jobs, bearer CRON_SECRET (Phase 7)
│       └── health/route.ts
├── domain/          ← pure logic, no I/O, 100% unit-testable
│   ├── metrics/     KPI formulas (single implementation)
│   ├── qualification/  MQL rules + version
│   ├── rules/       decision engine rules + version
│   ├── attribution/ UTM/click-id resolution + naming conventions
│   └── dates/       Asia/Jakarta business-date helpers
├── services/        ← orchestrates domain + repositories, may do I/O
│   ├── leads/ experiments/ workflows/ reports/ alerts/ crm-sync/
│   └── jobs/        job registry, locking, run logging (Phase 7)
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
- A feature never ships its own one-off card, table, badge or dialog. If the design system lacks a pattern, the pattern is added to the design system and then used — not inlined into the feature.

### 13.4 Design system inventory (built once, in Phase 1)

**Foundations.** Colour tokens including the four status semantics (`critical`, `attention`, `healthy`, `unknown`) · typography scale · spacing scale · radius · elevation · focus ring · dark-mode decision recorded in `DECISIONS.md` (default: light only for MVP).

**Primitives.** Button · input · select · textarea · checkbox · radio · switch · badge · tag · tooltip · dialog · sheet/drawer · dropdown menu · tabs · separator · toast.

**Operational patterns.** `PageHeader` (title, description, actions, filters slot) · `MetricCard` · `MetricDelta` (change with direction and goodness) · `DataTable` (sort, filter, column visibility, pagination, row actions) · `FilterBar` (URL-synced) · `StatusBadge` (one component, many domains — see the status table below) · `AlertItem` (severity, evidence, actions) · `IntegrationHealthCard` · `Timeline` · `DetailDrawer` · `ConfirmDialog` · `SectionCard`.

**States.** `LoadingSkeleton` (per pattern, not a spinner) · `EmptyState` (icon, explanation, the action or phase that fills it) · `ErrorState` (what failed, what still works, retry) · `StaleBanner` (age of the data) · `NotConnectedState` (integration absent — the default for unactivated pages).

**Status vocabulary — one component, one token set, every domain:**

| Domain | Values |
|---|---|
| Alert severity | `info` · `warning` · `critical` |
| Integration health | `healthy` · `degraded` · `failing` · `not_configured` |
| Workflow run | `pending` · `in_progress` · `completed` · `skipped` |
| Experiment | `draft` · `running` · `completed` · `cancelled` |
| Lead qualification | `new` · `mql` · `sql` · `disqualified` |
| Deal stage category | `open` · `won` · `lost` |
| Data freshness | `fresh` · `stale` · `unknown` |
| Rule verdict | `monitor` · `investigate` · `hold` · `scale_candidate` · `pause_candidate` · `suppressed` |

### 13.5 Progressive activation map (binding)

**Frontend foundation first, full-stack vertical slices later.** Phase 1 builds the frontend *system* and every route's visual skeleton. Each later phase activates one route as a complete slice — database → domain → repository → service → UI → tests — inside a shell that already exists.

| Route | Visual skeleton | Activated by | Unactivated state shown until then |
|---|---|---|---|
| `/today` | Phase 1 | Phase 3, extended in 5, 6, 9, 11 | Section placeholders, each naming the phase that fills it |
| `/playbook` | Phase 1 | Phase 4 | Empty state: no articles yet |
| `/experiments` | Phase 1 | Phase 5 | Empty state: no experiments yet |
| `/leads`, `/leads/[id]` | Phase 1 | Phase 6 | Empty state with "add lead" and "import CSV" affordances (inert until Phase 6) |
| `/funnel` | Phase 1 | Phase 6 | Empty state: no lead data yet |
| `/integrations` | Phase 1 | Phase 7, populated 8–10 | `NotConnectedState` per integration |
| `/performance` | Phase 1 | Phase 10 | `NotConnectedState`: "Meta Ads is not connected yet" |
| `/reports` | Phase 1 | Phase 12 | Empty state: no reports yet |
| `/settings` | Phase 1 | Phase 2 (auth/profile), extended in 8, 11 | Empty sections labelled by phase |
| `/workflows` | Phase 1 | Phase 3 | Empty state: no templates yet |
| `/login` | Phase 1 (visual) | Phase 2 (functional) | Non-functional form, not deployed publicly |

**Two rules that make this honest:**

1. **No fabricated data, ever.** An unactivated page shows why it is empty and which phase fills it. It never shows a plausible-looking number. A demo metric that survives into production is indistinguishable from a bug, and a screenshot of fake data circulated to a stakeholder is worse.
2. **The skeleton must be the real information architecture.** If Phase 1's `/leads` skeleton implies columns the domain will never produce, the skeleton is wrong and gets corrected in Phase 1 — not papered over in Phase 6.

---

## 14. Backend Architecture

### 14.1 API surface rules

| Kind | Use for | Auth |
|---|---|---|
| Server Components / server functions | All in-app reads and user-initiated writes | Supabase session cookie + RLS |
| `POST /api/ingest/*` | Machine-to-machine inbound (landing pages, WhatsApp gateway, HubSpot webhook) | HMAC signature + timestamp window + idempotency key. Signing happens **server-side at the source** (e.g. the Apps Script backend); a browser must never hold the ingest secret. A source that genuinely cannot sign uses a per-source scoped token with rate limiting, documented in `DECISIONS.md`. |
| `POST /api/jobs/[job]` | Scheduled and manually triggered background jobs | `Authorization: Bearer ${CRON_SECRET}` |
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

**Retryable vs terminal is a property of the error, not of the caller.** The retry queue re-attempts only `UPSTREAM_*`, `INTERNAL` and network errors; everything else is dead-lettered immediately. Business failures (a spam lead) and system failures (HubSpot 503) must never be logged, retried or alerted identically — conflating them produces either infinite retries of a permanently invalid payload or silent loss of a recoverable one.

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

**Daily workflow (Phase 3)**

| Table | Key columns |
|---|---|
| `workflow_templates` | `key text unique`, `name`, `cadence text check in ('daily','weekly','monthly')`, `weekdays int[] null`, `steps jsonb` (`[{key,label,help,required}]`), `version int`, `is_active bool` |
| `workflow_runs` | `template_id fk`, `run_date date`, `status text check in ('pending','in_progress','completed','skipped')`, `started_at`, `completed_at`, **unique(`template_id`,`run_date`)** |
| `workflow_items` | `run_id fk`, `step_key`, `label_snapshot`, `is_done bool`, `completed_at`, `notes`, **unique(`run_id`,`step_key`)** |
| `notes` | `note_date date`, `context_type text check in ('general','lead','experiment','campaign','report')`, `context_id uuid null`, `body text`, `created_by` |

`label_snapshot` exists so editing a template never rewrites the history of what was actually checked.

**Playbook (Phase 4)**

| Table | Key columns |
|---|---|
| `playbook_articles` | `slug unique`, `title`, `category`, `article_type text check in ('sop','checklist','decision_tree','troubleshooting','reference')`, `summary`, `body_md`, `tags text[]`, `status text check in ('draft','published','archived')`, `version int`, `published_at`, `updated_by` |

Revision history is **deferred**; `version` increments on publish and the previous body is not retained in MVP. If history becomes necessary, add `playbook_article_revisions` — do not build it speculatively.

**Experiments (Phase 5)**

| Table | Key columns |
|---|---|
| `experiments` | `code text unique` (`EXP-YYYY-NNN`), `title`, `hypothesis`, `variable`, `control_description`, `variant_description`, `primary_kpi text`, `secondary_kpi text null`, `baseline_value numeric null`, `target_value numeric null`, `status text check in ('draft','running','completed','cancelled')`, `priority int`, `confidence int check 1..5`, `effort int check 1..5`, `start_date`, `review_date`, `end_date`, `platform text null`, `external_refs jsonb` (campaign/adset/ad ids, LP urls), `owner_id` |
| `experiment_results` | `experiment_id fk unique`, `outcome text check in ('win','lose','inconclusive')`, `primary_kpi_result numeric`, `evidence jsonb`, `conclusion`, `learning`, `next_action`, `decided_at`, `decided_by` |

`experiment_variants` from v1.0 is **removed** — a single-operator MVP runs A/B, not multivariate; variant metadata lives in the two description fields plus `external_refs`.

**Lead & CRM mirror (Phase 6, synced in Phase 8)**

| Table | Key columns |
|---|---|
| `companies` | `hubspot_company_id text unique null`, `name`, `domain citext null`, `segment`, `industry`, `source_system`, `source_updated_at`, `synced_at` |
| `contacts` | `hubspot_contact_id text unique null`, `email citext null`, `phone_e164 text null`, `full_name`, `company_id fk null`, `lifecycle_stage text`, `lifecycle_stage_at timestamptz`, `hubspot_owner_id text null`, **first-touch block**: `ft_source, ft_medium, ft_campaign, ft_content, ft_term, ft_landing_page, ft_referrer, ft_at` (write-once), `synced_at`. Partial unique index on `email` and on `phone_e164` where not null. |
| `leads` | **one row per inquiry**, `contact_id fk`, `company_id fk null`, `inquiry_at timestamptz`, `inquiry_date date`, `channel text check in ('web_form','whatsapp','manual','import','referral','other')`, `platform text check in ('meta','google','linkedin','tiktok','organic','direct','referral','unknown')`, **last-touch block**: `lt_source, lt_medium, lt_campaign, lt_content, lt_term, landing_page, referrer`, `click_id_type text check in ('fbclid','gclid','ctwa_clid','li_fat_id','none')`, `click_id text null`, `campaign_id text null`, `adset_id text null`, `ad_id text null`, `product_interest`, `estimated_quantity int null`, `required_by_date date null`, `message text null`, `qualification_status text check in ('new','mql','sql','disqualified')`, `qualification_reason text`, `qualification_rule_version text`, `qualified_at`, `sql_at`, `disqualified_at`, `deal_id fk null`, `dedupe_key text unique`, `source_event_id fk null → webhook_events` |
| `lead_stage_events` | append-only: `lead_id fk`, `from_status`, `to_status`, `changed_at`, `source text check in ('pmos','hubspot','manual','import')`, `actor`, `note` |
| `deals` | `hubspot_deal_id text unique null`, `lead_id fk null`, `contact_id fk null`, `company_id fk null`, `name`, `pipeline`, `stage_key`, `stage_label`, `stage_category text check in ('open','won','lost')`, `amount numeric(18,2)`, `currency`, `expected_close_date`, `close_date`, `owner_hubspot_id`, `attributed_campaign text null`, `attribution_rule_version text null`, `source_updated_at`, `synced_at` |

> **AD-01 (binding).** `leads` is an **inquiry event**, not a person. A returning buyer produces a second `leads` row against the same `contacts` row. This is what makes per-campaign lead counts and CPL correct for a B2B business with repeat corporate buyers. v1.0's `unique(hubspot_contact_id)` on `leads` would have silently under-counted every repeat inquiry.

> **AD-02 (binding).** `lead_attributions` is **removed**. First touch is immutable on `contacts` (`ft_*`), last touch is per-inquiry on `leads` (`lt_*`). Multi-touch attribution is a Future item and will be added as an append-only `touchpoints` table when justified — not before.

**Integration plumbing (Phases 7–8)**

| Table | Key columns |
|---|---|
| `webhook_events` | `source`, `event_type`, `external_event_id null`, `idempotency_key text unique`, `signature_valid bool`, `payload jsonb`, `received_at`, `processed_at`, `status text check in ('received','processing','processed','rejected','failed','dead_letter')`, **`attempts int default 0`**, **`next_retry_at timestamptz null`**, **`locked_at timestamptz null`**, `last_error`, `correlation_id` |
| `sync_state` | `integration`, `resource`, `cursor text null`, `last_run_at`, `last_success_at`, `consecutive_failures int default 0`, `last_error`, **unique(`integration`,`resource`)** |
| `integration_runs` | `integration`, `resource`, **`job_key text null`**, `trigger text check in ('schedule','webhook','manual')`, `started_at`, `ended_at`, `status text check in ('running','success','partial','failed')`, `records_read`, `records_written`, `records_failed`, `error_summary`, `correlation_id` |

`webhook_events` is both the audit log and the **retry queue** (AD-16): an event that fails processing is not lost, it is scheduled. `integration_runs` is the single execution log for both integration syncs and scheduled jobs — `job_key` distinguishes them, which is cheaper and clearer than two near-identical tables. Job concurrency is enforced with a Postgres advisory lock keyed on the job name, so no lock table is needed.

`webhook_events.payload` retains raw input for replay and debugging. **Retention: 90 days**, then the payload column is nulled by a scheduled job while the event row is kept (NFR-G5 + storage discipline).

**Alerts (Phase 9)**

| Table | Key columns |
|---|---|
| `alerts` | `alert_key text` (deterministic dedupe key), `type`, `severity text check in ('info','warning','critical')`, `title`, `message`, `entity_type`, `entity_id uuid null`, `evidence jsonb`, `status text check in ('open','acknowledged','resolved','suppressed')`, `first_seen_at`, `last_seen_at`, `occurrence_count int default 1`, `last_notified_at`, `notification_count int default 0`, `acknowledged_at`, `resolved_at`, `resolved_reason`. **Partial unique index on `alert_key` where `status <> 'resolved'`** |

**Paid media (Phase 10)**

| Table | Key columns |
|---|---|
| `ad_accounts` | `platform text check in ('meta','google','linkedin','tiktok')`, `external_account_id`, `name`, `currency char(3)`, `timezone text`, `is_active`, **unique(`platform`,`external_account_id`)** |
| `ad_metrics_daily` | `ad_account_id fk`, `platform`, `metric_date date`, `campaign_id text`, `campaign_name`, `adset_id text not null default ''`, `adset_name`, `ad_id text not null default ''`, `ad_name`, `impressions bigint`, `clicks bigint`, `spend numeric(18,2)`, `currency`, `reach bigint null`, `frequency numeric null`, `platform_results int null`, `platform_result_type text null`, `source_timezone text`, `ingested_at`, **unique(`ad_account_id`,`metric_date`,`campaign_id`,`adset_id`,`ad_id`)** |

> **AD-03 (binding).** v1.0's `campaign_daily` is replaced by a **platform-agnostic** `ad_metrics_daily`. MVP writes campaign grain only (`adset_id`/`ad_id` = `''`); adding Google Ads or ad-level granularity later is an insert pattern change, not a migration of the fact table. `campaign_daily.leads` is deliberately **not** carried over: platform-reported lead counts and CRM lead counts are different facts and must never live in the same column.

**Decision engine & reporting (Phases 11–12)**

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
- Phase 13 includes an automated RLS audit: assert every `public` table has `relrowsecurity = true` and at least one policy.

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
| Secrets | **Vercel environment variables** | never in DB | — | — |
| Scheduling cadence | **`vercel.json` (in this repository)** | `integration_runs` | — | — |

**Conflict resolution.** Where both systems hold a value (lifecycle stage), HubSpot wins on every sync; PM OS only records that a divergence occurred, in `lead_stage_events` with `source='hubspot'`. A divergence rate above threshold raises a data-health alert instead of being silently overwritten forever.

---

## 17. Authentication & Authorization

- **Supabase Auth**, email + password with mandatory email confirmation, or magic link. Decide once in Phase 2 and record in `DECISIONS.md`.
- **Public sign-up is disabled** in the Supabase dashboard. Users are provisioned by the owner via invite. A `handle_new_user` trigger creates the matching `profiles` row. This is a security requirement, not a preference: an internal tool with open sign-up is an open database.
- Session handling with `@supabase/ssr` cookie helpers. Middleware protects the entire `(app)` route group; unauthenticated requests redirect to `/login?next=<path>`.
- **Authorization in MVP is binary** (authenticated or not). `profiles.role` exists and is read by a `can(action)` helper that returns `true` for `owner` on everything, so later role restrictions are a change in one function, not a scatter of conditionals.
- Service-role key is used **only** inside `lib/supabase/server-admin.ts`, which is guarded by an `import 'server-only'` directive so a client import fails the build.
- Machine callers never use Supabase Auth. They use HMAC (ingest) or `CRON_SECRET` (jobs).
- **Phase 1 precedes authentication by design.** During Phase 1 the route skeleton has no auth and holds no data; it is not deployed to a publicly reachable URL. Phase 2 wraps the existing shell in `(app)` route protection. Any deployment made before Phase 2 completes must use the host's deployment protection.
---

## 18. Integration Architecture (general)

Every integration in PM OS obeys the same seven-step contract. A workflow that skips a step does not pass its phase gate.

```
Trigger → Authenticate → Validate (Zod) → Normalise → Persist (idempotent) → Log (integration_runs) → Handle failure (classify → retry or dead-letter → alert)
```

| Concern | Rule |
|---|---|
| Authentication | Inbound: HMAC-SHA256 over `timestamp + method + path + raw body`, constant-time compare, reject if `abs(now - timestamp) > 300 s` (replay window). Outbound: bearer token from server-only environment variables. |
| Validation | Every external payload is parsed by a Zod schema before any other code touches it. Unparsed payloads are stored raw in `webhook_events` with `status='rejected'` and never partially applied. |
| Idempotency | `Idempotency-Key` header required on ingest; natural-key upserts everywhere else. Replay returns the original outcome. |
| Partial failure | A batch that writes 40 of 50 rows is `status='partial'`, not `'success'`. `records_failed` is populated and the failures are individually recoverable. |
| Retry | Bounded exponential backoff, max 5 attempts, only for retryable error classes (§14.2). Inbound events retry through the `webhook_events` queue (§21.3); outbound calls retry in-process and then through their owning job. |
| Dead-letter | After retry exhaustion: mark `webhook_events.status='failed'`, raise a `CRITICAL` alert once (dedupe key includes the resource), stop. Never retry forever. |
| Manual recovery | Every integration exposes a manual "re-sync" action on `/integrations` with a date-range or record-id parameter, and every scheduled job can be triggered manually from the same page. |
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

Created manually in HubSpot before Phase 8 (see Appendix A — external preconditions). Internal names are fixed here so the mapping has something stable to bind to.

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
HubSpot ──webhook (contact.propertyChange, deal.propertyChange, deal.creation)──┐
                                                                                 │
                     scheduler ── JOB-HUBSPOT-RECONCILE (30 min, cursor-based) ──┤
                                                                                 ▼
                                          POST /api/ingest/hubspot  (signature + Idempotency-Key)
                                                                                    │
                          Zod validate → map (§19.1) → normalise → upsert contacts/companies/deals
                                     → write lead_stage_events on any status change
                                     → recompute affected funnel views (tag revalidation)
                                     → emit alert candidates (Phase 9)
                                     → write integration_runs + sync_state
                                     → on retryable failure: schedule retry (§21.3)
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
2. The source's **server-side** component signs the payload and posts it to `POST /api/ingest/lead` with `X-Signature`, `X-Timestamp` and `Idempotency-Key`.
3. PM OS validates, normalises phone to E.164 and email to lowercase, resolves or creates `contacts` + `companies`, inserts a `leads` row with `dedupe_key`.
4. PM OS runs the qualification engine (§26.3) and records status + reason + rule version + a `lead_stage_events` row.
5. PM OS upserts the HubSpot Contact and associates the Company; stores `hubspot_contact_id`.
6. If MQL → alert candidate `new_mql` (Phase 9) → Slack on the next dispatch pass.
7. `webhook_events` and `integration_runs` rows written with a correlation id; a retryable failure at any step schedules a retry rather than losing the lead.

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

Slack app in the Du Anyam workspace → Incoming Webhook → dedicated channel (`#pm-alerts`). Webhook URL stored only as `SLACK_WEBHOOK_URL` in server-only environment variables. A separate `#pm-alerts-dev` channel and webhook is used by non-production environments — production alerts must never originate from a dev deploy.

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

## 21. Background Jobs, Scheduling & Retry Architecture

This section replaces the n8n orchestration layer of v2.0. Everything it describes runs **inside the PM OS application**, in this repository, under test.

### 21.1 Job catalogue

Every job is a pure server function registered in `services/jobs/registry.ts` and invoked through `POST /api/jobs/[job]`. The scheduler knows only a URL, a token and a cadence.

| Job key | Cadence (WIB) | Purpose | Phase |
|---|---|---|---|
| `JOB-RETRY-EVENTS` | every 10 min | Re-process `webhook_events` whose `next_retry_at` has passed | 7 |
| `JOB-HUBSPOT-RECONCILE` | every 30 min | Cursor-based pull of contacts/companies/deals modified since `sync_state.cursor` | 8 |
| `JOB-STALE-LEADS` | workdays 08:00 | Find MQL/SQL past SLA → alerts → one Slack digest | 9 |
| `JOB-DATA-HEALTH` | hourly | Freshness, coverage, completeness, mapping and currency checks → alerts | 9 |
| `JOB-NOTIFY-DISPATCH` | every 5 min | Send pending alert notifications honouring caps, quiet hours and digests | 9 |
| `JOB-META-INGEST` | daily 06:00 | Previous day + 3-day lookback into `ad_metrics_daily` | 10 |
| `JOB-EVALUATE-RULES` | daily 07:00 | Run the decision rule set, write `rule_evaluations`, raise alerts | 11 |
| `JOB-WEEKLY-REPORT` | Monday 07:30 | Pre-generate the weekly report draft, notify Slack | 12 |
| `JOB-RETENTION` | daily 02:00 | Null `webhook_events.payload` older than 90 days, prune old runs | 13 |

Every job is also runnable **manually** from `/integrations` by an authenticated user, with the same code path. A job that can only run on a schedule cannot be debugged.

### 21.2 Execution contract

```
scheduler (or manual trigger)
  → POST /api/jobs/[job]              Bearer CRON_SECRET (or authenticated session for manual)
  → acquire advisory lock on job_key  already running → 409, log skipped, exit
  → integration_runs row: status='running', correlation_id
  → run job body (service layer → domain → repository)
  → integration_runs: success | partial | failed, counts, error summary
  → release lock (always, including on throw)
```

Rules:
1. **Idempotent by window.** Running any job twice for the same window changes nothing. This is a property of the job body, not of the scheduler.
2. **Bounded work per invocation.** A job processes at most `jobs.max_batch` items (default 500) and reports `hasMore`; the next invocation continues. No job may run unbounded — a serverless runtime will kill it mid-write.
3. **Never throw past the handler.** A job failure is recorded and returns 200 with `{status:'failed'}` so a retrying scheduler does not stampede. Three consecutive failures raise a `CRITICAL` alert.
4. **Timeout awareness.** Each job declares a budget under the platform's function limit and stops cleanly when exceeded, leaving a resumable cursor.
5. **Clock independence.** A job derives its window from `sync_state` and the business clock, never from "now minus one run interval". A missed run must self-heal on the next invocation.

### 21.3 Retry queue (AD-16)

`webhook_events` is both the audit log and the retry queue.

```
inbound → verify signature → persist event (status='received') → respond 202 fast
        → process inline
             success  → status='processed', processed_at
             retryable→ status='failed', attempts++, next_retry_at = now + backoff(attempts)
             terminal → status='rejected'  (never retried)
        → after attempts > jobs.max_attempts (default 5) → status='dead_letter' + CRITICAL alert
```

Backoff: 1 min, 5 min, 25 min, 2 h, 6 h, with full jitter. `JOB-RETRY-EVENTS` claims rows with `next_retry_at <= now()` using `FOR UPDATE SKIP LOCKED` and a `locked_at` stamp so two invocations cannot process the same event. Dead-lettered events are listed on `/integrations` with a manual "retry now" control.

This is deliberately a small, boring queue inside Postgres. It is not a message broker, and adding one would be the kind of infrastructure this product does not need.

### 21.4 Outbound delivery

Slack (and any future outbound channel) is called directly from `integrations/slack/client.ts` with bounded retry. A send that ultimately fails sets the alert's `notification_status='failed'`; `JOB-NOTIFY-DISPATCH` re-attempts it on the next pass and raises an in-app alert after exhaustion. Notification failure is never silent, and it never blocks the transaction that produced the alert.

### 21.5 Future / Optional Orchestration Layer (n8n)

n8n is **not part of the MVP runtime and is not a dependency of any phase in this document.** It is recorded here so that introducing it later is a configuration change rather than a rewrite.

**When it would earn its place.** Cross-system automation that does not belong in PM OS: a WhatsApp BSP with an idiosyncratic webhook format, a partner system needing bespoke field mapping, a chain that touches four systems where only one of them is PM OS, or non-engineering staff needing to edit a routing rule without a deploy.

**Where it would sit — in front of the same endpoints, never inside them:**

```
External system → n8n (transform, route, schedule) → PM OS API (/api/ingest/*, /api/jobs/*)
                                                        → domain → repository → Supabase
```

**Binding constraints on any future adoption:**

1. PM OS must keep working with n8n switched off. No phase, feature or test may depend on it.
2. n8n calls stable PM OS endpoints. It never writes to Supabase directly, because that would bypass validation, qualification, stage events and idempotency.
3. No business rule may be implemented, duplicated or overridden in a workflow canvas (AD-04).
4. n8n may replace the *scheduler* (calling `/api/jobs/[job]` instead of Vercel Cron) without any code change — that is the cheapest legitimate use of it and requires nothing from this document.
5. If adopted, the n8n host inherits the §32 hardening requirements: HTTPS, authentication, restricted ports, encrypted credential store, backups, no public workflow editor, and scrubbed workflow exports.

The architecture already satisfies this: every scheduled job and every inbound event is an HTTP endpoint with an explicit contract. Anything that can speak HTTP can drive PM OS, and nothing that drives PM OS can reach past its front door.

---

## 22. Analytics Architecture (ad platforms, GA4, GTM)

### 22.1 Meta Ads (first connector, Phase 10)

- System User token with `ads_read` only, stored server-side, rotated per the platform's expiry policy; expiry date recorded in `app_settings` and surfaced as a `WARNING` alert 14 days before.
- Graph API version is **pinned** in `config/integrations.ts` with the date it was verified. Upgrading the version is a deliberate task with a `DECISIONS.md` entry, never an implicit follow of "latest".
- Daily pull at 06:00 WIB with a **3-day lookback** (attribution windows restate recent days) upserting into `ad_metrics_daily`.
- Store the ad account's own `timezone` and `currency` on `ad_accounts` and the `source_timezone` on every row. If the account timezone is not Asia/Jakarta, the discrepancy is displayed on `/integrations` rather than silently reconciled.
- Requested fields (campaign grain, MVP): `date_start`, `campaign_id`, `campaign_name`, `impressions`, `clicks`, `spend`, `reach`, `frequency`, and the account's primary result action + cost per result.

### 22.2 GA4 / GTM — post-MVP, with a precondition

GA4 and GTM are **not** in MVP. Website behaviour data does not change a daily decision until the landing-page and tracking foundation is verified. The precondition for building the connector is that GTM publishes a consistent `lead_submit` event with UTM and click-id parameters on all landing pages (Appendix A).

GTM/landing-page instrumentation is **external work**, not part of this application. What PM OS requires from it is a contract, defined in §23.2.

### 22.3 Other platforms

Google Ads, LinkedIn and TikTok connectors are Future. The schema is already platform-agnostic (AD-03), so adding one is: register the account in `ad_accounts`, implement an `integrations/<platform>/client.ts` conforming to the shared `AdMetricsProvider` interface, and register one job in the job catalogue. No migration, no view rewrite, no new architecture.

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

CTWA is an active acquisition channel and is treated as a first-class lead source in the ingest contract from Phase 7. However, whether `ctwa_clid` is actually obtainable depends on the WhatsApp API configuration (Cloud API vs BSP), which is an **external precondition outside this application's control** (Appendix A).

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

All formulas live in `domain/metrics/formulas.ts` and are implemented **exactly once**. No component, SQL view, report template, job or integration may recompute a metric independently. Every formula returns `null` — never `0`, never `Infinity` — when its denominator is zero or an input is missing, and the UI renders `null` as `—` with a "no data" tooltip.

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
| Layout + all section placeholders with honest empty states | Visual structure only, no data | Phase 1 |
| Header | Greeting, date, ISO week, environment badge | Phase 3 |
| Daily Checklist | Today's workflow run, weekday-aware | Phase 3 |
| Quick Notes | Free-text note, auto-tagged to the date, feeds the weekly report | Phase 3 |
| Experiment Review Queue | Experiments whose `review_date <= today` and are `running` | Phase 5 |
| Lead Follow-up Queue | MQL/SQL past SLA, or leads with missing attribution | Phase 6 |
| Data Health Strip | Per-integration status + last successful sync | Phase 7 (shell) / 8–10 (populated) |
| Alerts | Open alerts, grouped by severity | Phase 9 |
| Priority Actions | Top 3–5 ranked recommendations with evidence | Phase 11 |

A section with no data renders its empty state with the action that would fill it. It never renders a spinner indefinitely or disappears silently.

### 25.3 Checklist engine

- Templates define ordered steps; `cadence` plus `weekdays` decide which run on a given date.
- A run is materialised lazily on first view of the day — no scheduled job is required for the daily workflow to work — and is idempotent via `unique(template_id, run_date)`.
- Completing a step writes `completed_at`; steps can carry notes.
- A missed day is not backfilled and not deleted — the absence of a run is itself information for the weekly report.
- Seed templates shipped in Phase 3: **Daily Ops** (check spend pacing, review new leads, check stale MQL, check data health, log one note), **Weekly Review** (Monday), **Monthly Review**.

---

## 26. Lead & Funnel System

### 26.1 Conceptual funnel vs system state

```
Visitor → Inquiry (leads row) → MQL → SQL → Opportunity/Deal → Quotation → Negotiation → Won/Lost
          [PM OS owns]          [PM OS]  [HubSpot owns from here on]
```

PM OS decides MQL. **Everything from SQL onward is decided by sales in HubSpot** and mirrored. This boundary is what prevents two competing definitions of the pipeline.

### 26.2 Lead entry paths

1. **Manual form** in `/leads/new` — the path that makes the system usable before any integration exists.
2. **CSV import** with a mapping step and a dry-run preview — the path that loads history from a HubSpot export without hand typing.
3. **Signed API ingest** (Phase 7) — the automated path.

Paths 1 and 2 exist from Phase 6 and are what make the product usable before any integration. Path 3 adds automation without adding a second implementation.

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

**Linkage.** `external_refs` holds campaign/adset/ad ids and landing-page URLs so a completed experiment can later be laid over the metric timeline. Building that overlay is Phase 11 or later; storing the refs is free now.

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

Seed content shipped in Phase 4 (five articles minimum): campaign launch SOP, tracking QA checklist, weekly review checklist, "CPL up — diagnostic tree", UTM & naming convention reference.

Automatic playbook retrieval from an alert type is **Future**. The manual link from alert → article is Phase 9 and costs nothing.

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
| Secrets | Server-only env; `import 'server-only'` on the admin Supabase client; `.env.example` holds names only; no secret in any migration, seed, test fixture, or committed configuration file. Ingest secrets are held by the **server-side** component of each source, never by browser code. |
| Webhooks | HMAC-SHA256, constant-time compare, 300 s replay window, `Idempotency-Key` required, request body size cap (256 KB), content-type allowlist |
| Job endpoints | `CRON_SECRET` bearer token, distinct from every other secret, rotated on any suspected exposure; manual triggering additionally requires an authenticated session |
| PII | Minimise: store only what a decision requires. Never log name/email/phone/message. Slack carries identifiers only. Right-to-deletion path: delete `contacts` + `leads` rows by contact id, retaining aggregated counts. |
| Data retention | `webhook_events.payload` nulled after 90 days; `integration_runs` kept 12 months; lead data retained while commercially relevant, reviewed annually |
| Transport | HTTPS everywhere; HSTS on the app domain |
| Attack surface | The runtime is two managed services and three public endpoints (`/api/ingest/lead`, `/api/ingest/hubspot`, `/api/jobs/[job]`). Every new public endpoint requires a `DECISIONS.md` entry stating its authentication method. |
| Dependencies | `npm audit` in CI; no new dependency without justification |
| Least privilege | HubSpot private app scoped to the minimum CRM read/write objects actually used; Meta token `ads_read` only |
| Backups | Supabase automated backups verified by an actual restore drill in Phase 13 — an unverified backup is a hypothesis, not a backup |

**Threat cases that must be explicitly tested (Phase 13):** forged ingest signature · replayed ingest payload · job endpoint called without `CRON_SECRET` · anon client attempting to read `leads` · service-role key present in the client bundle · malformed HubSpot webhook · oversized payload.

---

## 33. Testing Strategy

| Layer | Tool | Scope | Bar |
|---|---|---|---|
| Unit | Vitest | `domain/**` — formulas, qualification, rules, date helpers, naming parser, attribution resolution | **100% of `domain/` branches for metrics, qualification and rules**. These are the parts that are wrong silently. |
| Schema/contract | Vitest + Zod | Every external payload schema, including malformed and hostile inputs | Every schema has at least one accept and one reject test |
| Repository/integration | Vitest against a local Supabase or a test schema | Upserts, idempotency, RLS behaviour, view correctness against seeded fixtures | Replay test mandatory per integration |
| Integration (external) | Vitest with recorded fixtures; no live API calls in CI | HubSpot mapping, Meta response parsing, Slack payload shape | Fixtures committed, refreshed deliberately |
| Jobs | Vitest | Idempotency per window, batch bounding, lock behaviour, retry backoff, failure recording | Every job has a double-run test |
| E2E | Playwright | Login → Today → create lead → qualify → create experiment → complete → generate report | Runs before every deploy |
| Failure | Playwright + mocks | Integration down, stale data, empty states, expired session, permission denied | Each must render a usable page |
| Security | Script + manual checklist | The threat cases in §32 | All must pass at the Phase 13 gate |

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

### 35.1 Delivery strategy

**Foundation → Visual System → Security → Vertical Slices → Integrations → Intelligence → Reporting → Hardening.**

Phase 1 builds the frontend system and the complete route skeleton. Every phase after Phase 2 activates one section of that skeleton as a **full-stack vertical slice**: migration → domain logic → repository → service → UI → tests, in that order, finished before the next slice begins.

Two anti-patterns are explicitly rejected:

- **Backend-first**, where all integrations and schemas are built before any usable interface exists. It defers every learning to the end and produces UI written against assumptions nobody tested.
- **Frontend-only**, where every page is fully built against mock data before its domain exists. It produces screens that cannot survive contact with real constraints, and demo data that leaks into production.

### 35.2 Phase map

| Phase | Name | Depends on | Slice activates | Daily value |
|---|---|---|---|---|
| 0 | Project Foundation & Architecture | — | — | Enabler |
| 1 | UI/UX Foundation & Application Shell | 0 | All routes, visually | Enabler (immediately reviewable) |
| 2 | Authentication & Security Foundation | 1 | `/login`, `/settings` (profile) | Enabler |
| 3 | Today / Daily Workflow OS | 2 | `/today`, `/workflows` | **Yes** |
| 4 | Playbook & SOP | 2 | `/playbook` | **Yes** |
| 5 | Experiment OS | 2 (3 for the Today queue) | `/experiments` | **Yes** |
| 6 | Lead & Funnel Core | 2 (3 for the Today queue) | `/leads`, `/leads/[id]`, `/funnel` | **Yes** |
| 7 | Integration & Background Job Foundation | 6 | `/integrations` | Yes (automation) |
| 8 | HubSpot CRM Integration | 6, 7 | `/integrations/hubspot`, lead detail | **Yes** |
| 9 | Alerts & Slack | 6, 7 | `/today` alerts | **Yes** |
| 10 | Meta Ads & Performance | 6, 7 (9 for freshness alerts) | `/performance` | **Yes** |
| 11 | Decision Engine & Today v2 | 6, 9, 10 | `/today` priority actions | **Yes** |
| 12 | Reporting | 3, 5, 6, 10, 11 | `/reports` | **Yes** |
| 13 | Production Hardening | all | `/integrations` completion | Enabler |

**MVP Core = Phases 0–6. MVP Integration = Phases 7–10. Post-MVP = Phases 11–13.**

### 35.3 Dependency audit

Each row is a rule the ordering had to satisfy. Verified against the full document before the numbering was fixed.

| # | Rule | Satisfied by | Why it matters |
|---|---|---|---|
| D1 | Project foundation precedes application development | 0 → 1 | Without env validation and CI, every later phase gate is unverifiable |
| D2 | UI foundation exists before any feature UI | 1 → 3…12 | Otherwise each feature invents its own card, table and empty state, and the system is never unified afterwards |
| D3 | Authentication precedes any sensitive operational data | 2 → 3 | The first real data written is a workflow note in Phase 3; nothing before it holds data |
| D4 | Lead/funnel domain precedes CRM synchronisation | 6 → 8 | Syncing into an unproven schema turns a migration into a rewrite |
| D5 | Integration infrastructure precedes any external integration | 7 → 8, 10 | Otherwise HubSpot and Meta each build their own signature, retry and logging, and they will differ |
| D6 | The alert domain precedes its transport | 9 (domain first, Slack second) | Building them together produces a Slack-shaped alert model that cannot be shown in-app |
| D7 | Paid-media data precedes performance decision rules | 10 → 11 | A rule without spend has nothing to evaluate |
| D8 | Decision rules precede data-driven priority actions | 11 (rules, then Today v2) | Ranking requires verdicts to rank |
| D9 | Trusted data precedes reporting | 3, 5, 6, 10, 11 → 12 | A report is an assembly step; it must never compute anything new |
| D10 | Hardening follows the workflows it hardens | 13 last | E2E needs paths to test; a restore drill needs data to restore |
| D11 | Nothing in the runtime depends on an external orchestrator | every phase | AD-15. The scheduler is a clock and is replaceable without a code change |

**Corrections made relative to v2.0:** the UI foundation was extracted from the auth phase into a standalone Phase 1 (D2); authentication moved to Phase 2 so it wraps an existing shell rather than inventing one; the n8n foundation phase became Phase 7, an application-owned integration and job foundation (D5, D11); every subsequent phase shifted by one and all requirement, task and test IDs were renumbered accordingly.

### 35.4 Phase structure

Every phase below uses the same 25 headings. Where a category genuinely does not apply, it says **Not applicable in this phase** rather than inventing work.

---

## Phase 0 — Project Foundation & Architecture

**1. Overview.** Repository, toolchain, control documents, environment validation, CI. No product features, no visual design, no business logic.

**2. Objective.** Make every later phase mechanically verifiable: one command set runs lint, typecheck, tests and build, and a missing environment variable fails loudly at startup rather than at 2 a.m. in production.

**3. User value.** None directly. This phase exists so that the other thirteen are cheap.

**4. Scope.** Next.js + TypeScript strict scaffold · Tailwind + shadcn/ui installed (tokens come in Phase 1) · ESLint/Prettier · Vitest + Playwright configured with a smoke test each · Zod-validated env modules · the folder structure of §12 with layer READMEs · control documents · GitHub Actions CI · `.env.example` · Supabase CLI initialised with a migrations directory and the `0001_extensions` migration only.

**5. Out of scope.** Design tokens, components, any page beyond a placeholder, any table, authentication, any integration, any business logic.

**6. Dependencies.** None.

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-0.1 | The repository builds and serves a placeholder page with `npm run dev` and `npm run build`. |
| FR-0.2 | `lib/env.ts` parses `process.env` with Zod at module load; a missing or malformed required variable throws with the variable name before any request is served. |
| FR-0.3 | Server-only variables are unreachable from client code; importing `lib/env.server.ts` from a client component fails the build. |
| FR-0.4 | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all exist and exit 0. |
| FR-0.5 | CI runs those four commands on every push and pull request and blocks merge on failure. |
| FR-0.6 | Control documents exist and are non-empty: `PRD.md` (this document), `ARCHITECTURE.md`, `DATA_MODEL.md`, `INTEGRATIONS.md`, `AGENTS.md`, `TASKS.md`, `DECISIONS.md`, `.env.example`. |

**8. Non-functional requirements.** NFR-0.1 Node version pinned in `.nvmrc` and `engines`. NFR-0.2 Baseline dependency count recorded in `DECISIONS.md`. NFR-0.3 The Supabase CLI applies migrations from empty against a local or dev project.

**9. Tools / technologies.** Next.js (App Router), TypeScript, Tailwind, shadcn/ui, ESLint, Prettier, Vitest, Playwright, Zod, Supabase CLI, GitHub Actions.

**10. Data model changes.** `0001_extensions` only: `pgcrypto`, `citext`, and the shared `set_updated_at()` trigger function. No tables.

**11. Backend tasks.**
- BE-0.1 Scaffold the Next.js App Router project with `strict: true`.
- BE-0.2 `lib/env.ts` (public) and `lib/env.server.ts` (`import 'server-only'`).
- BE-0.3 Folder structure of §12 with a one-line README per layer stating what may and may not live there.
- BE-0.4 Configure Vitest (node + jsdom) and Playwright.
- BE-0.5 Supabase CLI init; `0001_extensions`; `npm run db:migrate`, `npm run db:types`.
- BE-0.6 Author `AGENTS.md` from §39.

**12. Frontend tasks.**
- FE-0.1 Install Tailwind and shadcn/ui with default configuration (no tokens yet — Phase 1 owns them).
- FE-0.2 Placeholder root page showing app name and build commit.

**13. Integration tasks.** INT-0.1 GitHub Actions workflow: install → lint → typecheck → test → build.

**14. Background job tasks.** Not applicable in this phase.

**15. Routes / UI.** `/` placeholder only.

**16. User flow.** Developer clones, copies `.env.example`, runs `npm run dev`, sees the placeholder.

**17. Edge cases.** Missing `.env` → explicit error naming the variable · Node version mismatch → CI fails with a clear message · migrations applied twice → idempotent.

**18. Error handling.** Startup validation errors are fatal and descriptive. No silent defaults for required variables.

**19. Security requirements.** `.env*` gitignored except `.env.example`. Secret-scanning pre-commit hook (`sk-`, `xoxb-`, `pat-`, `Bearer `, `hooks.slack.com`). No secret in history.

**20. Testing.** TEST-0.1 env parser rejects a missing required var · TEST-0.2 env parser accepts a valid set · TEST-0.3 Playwright smoke loads `/` · TEST-0.4 CI green on a clean clone.

**21. Acceptance criteria.**
- [ ] `npm run dev` serves the placeholder without warnings
- [ ] All four verification commands exit 0 locally and in CI
- [ ] Removing a required env var produces a named, fatal error
- [ ] All eight control documents exist and are non-empty
- [ ] `0001_extensions` applies cleanly from an empty database
- [ ] No secret anywhere in the repository or its history

**22. Definition of done.** CI is green on `main`, the folder structure matches §12, and `TASKS.md` lists Phase 1 as next with no Phase 0 item open.

**23. Deliverables.** Repository, CI workflow, env modules, `0001_extensions`, control documents.

**24. Implementation order.** 1) scaffold → 2) lint/format → 3) env modules + tests → 4) folder structure + READMEs → 5) Supabase CLI + `0001` → 6) test runners → 7) CI → 8) control documents.

**25. Completion report.** Standard format (§39.3), plus the baseline dependency count and the exact verification commands later phases must run.

---

## Phase 1 — UI/UX Foundation & Application Shell

**1. Overview.** The visual operating system: design tokens, component library, application shell, and the complete route skeleton with honest unactivated states.

**2. Objective.** Establish the information architecture and every reusable interaction pattern **once**, so later phases add behaviour to an interface that already exists instead of inventing a new one per feature.

**3. User value.** The operator can navigate the intended product end to end and react to its structure before anything is integrated. Structural mistakes surface now, when they cost a day, not in Phase 10, when they cost a rewrite.

**4. Scope.** Design tokens and the status vocabulary (§13.4) · primitives · operational patterns (`PageHeader`, `MetricCard`, `MetricDelta`, `DataTable`, `FilterBar`, `StatusBadge`, `AlertItem`, `IntegrationHealthCard`, `Timeline`, `DetailDrawer`, `ConfirmDialog`, `SectionCard`) · the five state components (`LoadingSkeleton`, `EmptyState`, `ErrorState`, `StaleBanner`, `NotConnectedState`) · app shell (sidebar, header, page container, breadcrumb, environment badge) · responsive layout · the full route skeleton of §13.5 · an env-gated component gallery.

**5. Out of scope.** Authentication (Phase 2), any database table, any business logic, any data fetching, **any mock or sample metric presented as real**, dark mode unless `DECISIONS.md` says otherwise.

**6. Dependencies.** Phase 0.

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-1.1 | Design tokens exist for colour, typography, spacing, radius, elevation and focus, and are the only source of those values; no component hard-codes a hex, px font size or spacing value. |
| FR-1.2 | The four status semantics (`critical`, `attention`, `healthy`, `unknown`) are tokens and render with **icon plus text label**, never colour alone. |
| FR-1.3 | `StatusBadge` renders every status vocabulary in §13.4 from a single component and token set. |
| FR-1.4 | The shell renders a persistent sidebar with all primary routes, a header with global date-range control and environment badge, and a consistent page container. |
| FR-1.5 | The layout is usable at 1280–1920 px and remains readable and navigable at 390 px, with the sidebar collapsing to a drawer. |
| FR-1.6 | Every route in §13.5 exists and renders its skeleton: `/today`, `/performance`, `/leads`, `/leads/[id]`, `/funnel`, `/experiments`, `/playbook`, `/workflows`, `/reports`, `/integrations`, `/settings`, `/login`. |
| FR-1.7 | Each unactivated route renders an `EmptyState` or `NotConnectedState` naming what will live there and which phase delivers it. |
| FR-1.8 | **No route displays a fabricated metric, chart series or table row presented as real data.** Illustrative content exists only in the component gallery, which is visibly labelled as such. |
| FR-1.9 | `LoadingSkeleton`, `ErrorState` and `StaleBanner` exist per pattern and are demonstrated in the gallery. |
| FR-1.10 | `DataTable` supports sorting, column visibility, pagination and row actions against an injected data source, with loading and empty states built in. |
| FR-1.11 | `FilterBar` reads and writes URL search params so any filtered view is shareable and reload-safe. |
| FR-1.12 | Keyboard navigation reaches every interactive element with a visible focus state, and an automated accessibility check passes on the shell and three representative routes. |

**8. Non-functional requirements.** NFR-1.1 First meaningful paint ≤ 1.5 s on the shell. NFR-1.2 No client-side JavaScript for purely static skeleton routes. NFR-1.3 Axe reports zero critical violations on the shell, `/today`, `/leads`, `/experiments`. NFR-1.4 The gallery is excluded from the production build or gated behind an env flag.

**9. Tools / technologies.** Next.js App Router, Tailwind, shadcn/ui, lucide-react, Playwright, axe.

**10. Data model changes.** Not applicable in this phase — no table is created and no data is read.

**11. Backend tasks.** BE-1.1 Route-group scaffolding for `(app)` and `(auth)` with layouts (no guard yet; Phase 2 adds the guard without restructuring). BE-1.2 `config/navigation.ts` as the single source of sidebar and breadcrumb.

**12. Frontend tasks.**
- FE-1.1 Design tokens and Tailwind theme extension.
- FE-1.2 Primitives via shadcn/ui, restyled to the tokens.
- FE-1.3 `PageHeader`, `SectionCard`, `MetricCard`, `MetricDelta`.
- FE-1.4 `DataTable` with sort, column visibility, pagination, row actions.
- FE-1.5 `FilterBar` with URL sync.
- FE-1.6 `StatusBadge` covering the full status vocabulary.
- FE-1.7 `AlertItem`, `IntegrationHealthCard`, `Timeline`, `DetailDrawer`, `ConfirmDialog`.
- FE-1.8 `LoadingSkeleton`, `EmptyState`, `ErrorState`, `StaleBanner`, `NotConnectedState`.
- FE-1.9 App shell: sidebar, header, environment badge, responsive drawer.
- FE-1.10 Route skeletons for all twelve routes with unactivated states, including the Today section placeholders of §25.2.
- FE-1.11 `/dev/gallery`, env-gated.

**13. Integration tasks.** Not applicable in this phase.

**14. Background job tasks.** Not applicable in this phase.

**15. Routes / UI.** All twelve routes of §13.5, plus `/dev/gallery`.

**16. User flow.** The operator opens the app, walks every route, sees the intended structure, and can say "the leads table is missing X" or "Today has too many sections" while changing it is still cheap.

**17. Edge cases.** Narrow viewport (drawer plus horizontal table scroll, not layout collapse) · very long titles and company names (truncate with a title attribute) · tables with 0, 1 and 200 injected rows · invalid deep-linked filter params (ignored, not crashed) · unknown route (404 inside the shell, not a bare error).

**18. Error handling.** A route-level error boundary renders `ErrorState` inside the shell so navigation still works. No unstyled framework error page reaches the user.

**19. Security requirements.** The Phase 1 build **is not deployed to a publicly reachable URL**; previews use the host's deployment protection. It holds no data and no secret, but an unauthenticated internal-tool skeleton on a public URL discloses internal structure for no benefit. `/dev/gallery` is unreachable in production.

**20. Testing.** TEST-1.1 every route renders without error · TEST-1.2 axe zero critical on shell plus three routes · TEST-1.3 responsive smoke at 1280 px and 390 px · TEST-1.4 `DataTable` sort/paginate/empty with injected fixtures · TEST-1.5 `FilterBar` URL round-trip including invalid params · TEST-1.6 `StatusBadge` renders every status value with icon and label · TEST-1.7 a lint rule or test asserts no hard-coded colour or spacing outside the token file.

**21. Acceptance criteria.**
- [ ] All twelve routes render with an intentional unactivated state
- [ ] No route shows a fabricated metric or table row
- [ ] The token file is the only source of colour, spacing and typography
- [ ] Every status vocabulary renders through one `StatusBadge` with icon and text
- [ ] Layout works at 1280 px and 390 px
- [ ] Axe reports zero critical violations on the audited routes
- [ ] The gallery is unreachable in a production build
- [ ] Four verification commands pass

**22. Definition of done.** The operator has reviewed the full navigable skeleton and the information architecture is agreed. Any structural change they asked for is implemented or recorded in `DECISIONS.md` with a rationale.

**23. Deliverables.** Token file, component library, state components, app shell, twelve route skeletons, component gallery, accessibility baseline.

**24. Implementation order.** 1) tokens → 2) primitives → 3) state components → 4) operational patterns → 5) shell + navigation config → 6) route skeletons + unactivated states → 7) gallery → 8) responsive pass → 9) accessibility pass → 10) tests.

**25. Completion report.** Standard format, plus the component inventory actually built, any pattern deliberately deferred, and which routes' information architecture the operator changed during review.

---

## Phase 2 — Authentication & Security Foundation

**1. Overview.** Supabase project, `profiles`, `app_settings`, RLS baseline, invite-only auth, and route protection wrapped around the Phase 1 shell.

**2. Objective.** Establish the security posture before the first row of real data exists, so it is never retrofitted.

**3. User value.** The operator logs in; the application becomes theirs and private.

**4. Scope.** Supabase dev project · auth with public sign-up disabled · `profiles` + `handle_new_user` trigger · `app_settings` with typed schema and defaults · RLS enabled with policies · middleware protecting `(app)` · session handling · login made functional · `/settings` profile section · `can()` authorization helper · first protected deployment.

**5. Out of scope.** Any domain table, any integration, role UI beyond `owner`, SSO, custom password-reset flows.

**6. Dependencies.** Phase 1.

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-2.1 | A user signs in with the configured method and lands on `/today`. |
| FR-2.2 | An unauthenticated request to any `(app)` route redirects to `/login?next=<path>` and returns there after login. |
| FR-2.3 | Public sign-up is disabled; self-registration fails. Users are provisioned by invite. |
| FR-2.4 | A new `auth.users` row automatically creates a matching `profiles` row via trigger. |
| FR-2.5 | Sign-out clears the session; subsequent protected requests redirect to login. |
| FR-2.6 | RLS is enabled on `profiles` and `app_settings`, with no policy granting `anon` any access. |
| FR-2.7 | `/settings` reads and writes `app_settings` with Zod validation, recording `updated_by` and `updated_at`. |
| FR-2.8 | A malformed or unknown settings value falls back to its documented default and surfaces a warning rather than crashing the reader. |
| FR-2.9 | `can(action)` is the single authorization helper, returning `true` for `owner` on everything in MVP, and is the only place a future role check will be added. |
| FR-2.10 | The environment badge reflects the real environment, and the service-role key is absent from the client bundle. |

**8. Non-functional requirements.** NFR-2.1 The session is verified server-side on every protected request; the client is never trusted. NFR-2.2 Auth failures return a generic message (no user enumeration). NFR-2.3 Cookies are `httpOnly`, `secure`, `sameSite=lax`.

**9. Tools / technologies.** Supabase (Postgres, Auth), `@supabase/ssr`, Next.js middleware, Zod.

**10. Data model changes.** `0002_identity`: `profiles`, `app_settings`, `updated_at` triggers, `handle_new_user`, RLS policies, and a seed of every documented settings default.

**11. Backend tasks.** BE-2.1 `0002_identity`. BE-2.2 Supabase clients: browser (anon), server (session), admin (service role, `server-only`). BE-2.3 Middleware session refresh and `(app)` protection. BE-2.4 `config/settings-schema.ts` + `repositories/settings.ts`. BE-2.5 `lib/auth/can.ts`. BE-2.6 Generated database types wired into `npm run db:types`.

**12. Frontend tasks.** FE-2.1 Make the Phase 1 login page functional. FE-2.2 User menu with sign-out. FE-2.3 `/settings` profile and preferences using existing patterns. FE-2.4 Session-expiry handling that preserves the current route.

**13. Integration tasks.** INT-2.1 First protected deployment with development environment variables; verify auth on the deployed URL.

**14. Background job tasks.** Not applicable in this phase.

**15. Routes / UI.** `/login` (functional), `/settings` (partially activated), all `(app)` routes now protected.

**16. User flow.** Open app → `/login` → sign in → `/today` → navigate → change a setting → sign out.

**17. Edge cases.** Expired session mid-navigation · two tabs where one signs out · missing `profiles` row because the trigger failed (recoverable error, not a crash) · malformed settings value · a `next` parameter pointing at an external URL (rejected — open-redirect guard).

**18. Error handling.** Auth errors are generic to the user and detailed in server logs. A settings write failing validation rejects the whole form and preserves input.

**19. Security requirements.** Sign-up disabled in the Supabase console and recorded in `DECISIONS.md` — it is a dashboard setting, invisible to code review, and therefore easy to lose. Service-role key confined to `lib/supabase/server-admin.ts`. Open-redirect guard on `next`. No `anon` policy anywhere.

**20. Testing.** TEST-2.1 middleware redirects unauthenticated · TEST-2.2 `next` round-trip and external `next` rejected · TEST-2.3 RLS: user A cannot read user B's profile · TEST-2.4 settings Zod rejection and default fallback · TEST-2.5 E2E login → today → sign out · TEST-2.6 build output contains no service-role key.

**21. Acceptance criteria.**
- [ ] Login, logout and `next` round-trip work on the deployed URL
- [ ] Self sign-up is impossible
- [ ] `profiles` is created automatically for a new user
- [ ] RLS enabled with policies on both tables; anon has no access
- [ ] Settings round-trip with validation and audit fields
- [ ] External `next` values are rejected
- [ ] No service-role key in the client bundle
- [ ] Four verification commands pass

**22. Definition of done.** A fresh browser reaches `/today` only by authenticating, on a deployed environment, with RLS verified by test.

**23. Deliverables.** `0002_identity`, Supabase clients, middleware, functional login, settings module, `can()`, generated types, first protected deployment.

**24. Implementation order.** 1) migration → 2) RLS + triggers → 3) generated types → 4) clients → 5) middleware → 6) login + actions → 7) settings repository + UI → 8) `can()` → 9) tests → 10) deploy.

**25. Completion report.** Standard format, plus explicit confirmation that public sign-up is disabled in the Supabase console and that the RLS policy set matches §15.5.

---

## Phase 3 — Today / Daily Workflow OS

**1. Overview.** Workflow templates, runs, items and notes — the first slice producing daily value, activating `/today` and `/workflows`.

**2. Objective.** Make the app worth opening every morning before any integration exists.

**3. User value.** The operator runs a real daily checklist, captures notes against the date, and sees a coherent Today page.

**4. Scope.** Template CRUD (seeded, editable) · lazy run materialisation · step completion with notes · weekday-aware cadence · Today header, checklist and quick notes · `/workflows` history.

**5. Out of scope.** Alerts, priority actions, lead queues, populated data health, any scheduled job, any integration.

**6. Dependencies.** Phases 1 and 2.

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-3.1 | Three templates ship seeded: Daily Ops (weekdays), Weekly Review (Monday), Monthly Review (first workday). |
| FR-3.2 | Opening `/today` materialises the applicable runs exactly once per day; repeated loads never create duplicates. |
| FR-3.3 | A step can be completed and un-completed; `completed_at` is set and cleared accordingly. |
| FR-3.4 | A step accepts an optional note, saved without a full page reload. |
| FR-3.5 | Run status derives from its items: `pending` → `in_progress` → `completed` when all required items are done. |
| FR-3.6 | `workflow_items.label_snapshot` preserves the step label as it was at run creation; later template edits never alter history. |
| FR-3.7 | Templates and steps can be created, edited, reordered and deactivated. |
| FR-3.8 | Deactivating a template stops future runs and preserves past ones. |
| FR-3.9 | A dated free-text note can be added from `/today` and is listed by date. |
| FR-3.10 | `/workflows` lists the last 30 days of runs with completion percentage and drill-down. |
| FR-3.11 | Business dates use Asia/Jakarta: a run created at 23:50 WIB belongs to that WIB day, not the UTC day. |

**8. Non-functional requirements.** NFR-3.1 Step toggle is optimistic and reverts visibly on failure. NFR-3.2 `/today` renders in ≤ 1.5 s with 90 days of history.

**9. Tools / technologies.** Supabase, Next.js server functions, `date-fns-tz`.

**10. Data model changes.** `0003_workflows`: `workflow_templates`, `workflow_runs`, `workflow_items`, `notes`, indexes, RLS, plus a seed migration for the three templates.

**11. Backend tasks.** BE-3.1 Migration + seed. BE-3.2 `domain/dates` (`toJakartaDate`, `jakartaWeekday`, `jakartaWeekBounds`, `jakartaMonthBounds`) with boundary tests. BE-3.3 `services/workflows`: `getOrCreateRunsForDate`, `toggleItem`, `setItemNote`, `recomputeRunStatus`. BE-3.4 `services/notes`.

**12. Frontend tasks.** FE-3.1 Activate the Today header and checklist section. FE-3.2 Checklist component with optimistic toggle and inline notes. FE-3.3 Quick Notes composer and day list. FE-3.4 `/workflows` history. FE-3.5 Template editor. All built from Phase 1 patterns; any new pattern is added to the design system first.

**13. Integration tasks.** Not applicable in this phase.

**14. Background job tasks.** Not applicable in this phase — runs materialise lazily on view, deliberately, so the daily workflow never depends on a scheduler.

**15. Routes / UI.** `/today` (header, checklist, notes), `/workflows`, `/workflows/templates`.

**16. User flow.** Morning → `/today` → the day's checklist is present → tick items, add a note → add a quick note → everything persists across reload and devices.

**17. Edge cases.** First use of a template mid-day · 00:00 WIB boundary · a template edited while a run is open · a weekend with no applicable template (explicit "no checklist today", not a blank page) · deactivating a template with an in-progress run · two tabs toggling the same item.

**18. Error handling.** A failed toggle reverts the optimistic state with a retry affordance. Failed run materialisation shows the page with a banner instead of blocking the route.

**19. Security requirements.** All writes through authenticated server functions. RLS restricts to authenticated. Notes are free text and documented as unsuitable for credentials or customer PII.

**20. Testing.** TEST-3.1 run materialisation idempotency · TEST-3.2 weekday cadence across a full week · TEST-3.3 WIB date boundary · TEST-3.4 run status derivation · TEST-3.5 label snapshot survives a template edit · TEST-3.6 E2E complete a checklist and reload.

**21. Acceptance criteria.**
- [ ] `/today` shows the correct checklist for the current WIB weekday
- [ ] Five refreshes create exactly one run per template per day
- [ ] Completed steps and notes survive reload and a different browser
- [ ] Editing a template does not alter a historical run's labels
- [ ] `/workflows` shows 30-day history with completion percentages
- [ ] A day with no applicable template renders an explicit state
- [ ] Four verification commands pass

**22. Definition of done.** The operator has run the daily checklist in the app on at least one real workday without touching the database.

**23. Deliverables.** `0003_workflows` + seed, date domain module, workflow and note services, Today activation, workflows history, template editor.

**24. Implementation order.** 1) migration → 2) date domain + tests → 3) repositories → 4) services + tests → 5) seed → 6) Today checklist → 7) notes → 8) history → 9) template editor → 10) E2E.

**25. Completion report.** Standard format, plus the seeded template content and any Phase 1 component that had to be extended — and whether the extension went into the design system rather than the feature.

---

## Phase 4 — Playbook & SOP

**1. Overview.** Structured operational knowledge with search, types, categories and deep-linkable slugs. Activates `/playbook`.

**2. Objective.** Move procedure out of memory and chat history into a surface an alert can link to.

**3. User value.** The operator finds the launch SOP or the tracking QA checklist in seconds and keeps it current.

**4. Scope.** Article CRUD in markdown · five article types (`sop`, `checklist`, `decision_tree`, `troubleshooting`, `reference`) · tags and categories · full-text search · draft/published/archived · slug routing · five seeded articles with real content.

**5. Out of scope.** Revision history, collaborative editing, AI generation, attachments, automatic retrieval from alerts. This is an operational knowledge base, not a CMS.

**6. Dependencies.** Phases 1 and 2.

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-4.1 | Articles can be created, edited, published, archived and deleted. |
| FR-4.2 | Articles are addressable at `/playbook/[slug]`; slugs are unique, generated from the title, and manually overridable. |
| FR-4.3 | Markdown renders headings, lists, tables, checkboxes and code, and is sanitised against injected HTML. |
| FR-4.4 | Full-text search across title, summary, body and tags returns ranked results in ≤ 500 ms for up to 500 articles. |
| FR-4.5 | Articles filter by `article_type`, `category` and tag. |
| FR-4.6 | Publishing increments `version` and sets `published_at`. |
| FR-4.7 | Archived articles are excluded from search by default and reachable with an explicit filter; an old link to one shows a banner, not a 404. |
| FR-4.8 | Five articles are seeded: campaign launch SOP, tracking QA checklist, weekly review checklist, "CPL up — diagnostic tree", UTM & naming convention reference. |

**8. Non-functional requirements.** NFR-4.1 Search uses a `tsvector` generated column with a GIN index, not `ILIKE` scans. NFR-4.2 Markdown rendering is sanitised.

**9. Tools / technologies.** Supabase full-text search, a markdown renderer with a sanitiser.

**10. Data model changes.** `0004_playbook`: `playbook_articles` with `search_vector` generated column, GIN index, RLS, plus a seed migration with the five articles.

**11. Backend tasks.** BE-4.1 Migration + seed. BE-4.2 `services/playbook` (CRUD, slug generation with collision handling, ranked search).

**12. Frontend tasks.** FE-4.1 `/playbook` list with filters and search. FE-4.2 `/playbook/[slug]` reader with a table of contents for long articles. FE-4.3 Editor with markdown preview, type selector, tags and status control.

**13. Integration tasks.** Not applicable in this phase.

**14. Background job tasks.** Not applicable in this phase.

**15. Routes / UI.** `/playbook`, `/playbook/new`, `/playbook/[slug]`, `/playbook/[slug]/edit`.

**16. User flow.** Search "tracking" → open the QA checklist → follow it → edit a step that changed → publish.

**17. Edge cases.** Duplicate slug (suffix `-2`) · very long article · empty search results (offer to create) · archived article opened from an old link · markdown containing a script tag.

**18. Error handling.** A save failure preserves the editor buffer; a draft is never lost to a network error.

**19. Security requirements.** Sanitise rendered markdown. Editor help text states that articles may reference thresholds but never secrets.

**20. Testing.** TEST-4.1 slug collision · TEST-4.2 search ranking on seeded content · TEST-4.3 status transitions and archive filtering · TEST-4.4 markdown sanitisation of injected HTML · TEST-4.5 E2E create → publish → find via search.

**21. Acceptance criteria.**
- [ ] Five seeded articles exist and are readable
- [ ] Search finds an article by a body-only term
- [ ] Filters narrow by type, category and tag
- [ ] Slug collisions resolve without error
- [ ] Injected HTML does not execute
- [ ] Four verification commands pass

**22. Definition of done.** The operator has replaced at least one procedure previously kept in chat or a spreadsheet with a published article.

**23. Deliverables.** `0004_playbook` + seed, playbook service, list/reader/editor.

**24. Implementation order.** 1) migration + search vector → 2) service → 3) seed content → 4) list + filters → 5) reader → 6) editor → 7) tests.

**25. Completion report.** Standard format, plus the seeded article titles and their types.

---

## Phase 5 — Experiment OS

**1. Overview.** Experiment lifecycle from backlog to documented learning. Activates `/experiments` and adds the Today review queue.

**2. Objective.** Make "why did we change this, and what happened?" answerable months later.

**3. User value.** Every meaningful optimisation is recorded in under a minute and produces a searchable learning.

**4. Scope.** Experiment CRUD · constrained lifecycle transitions · backlog prioritisation · review-date and duration guardrails · results with mandatory learning · learning library search · Today review queue.

**5. Out of scope.** Statistical significance, automatic metric attachment from ad platforms, variant traffic splitting, multivariate design, AI recommendations.

**6. Dependencies.** Phases 1 and 2; Phase 3 for the Today section.

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-5.1 | An experiment requires title, hypothesis, variable, primary KPI, start date and review date at creation. |
| FR-5.2 | `code` is auto-generated as `EXP-YYYY-NNN`, unique and monotonic within a year, race-safe. |
| FR-5.3 | Transitions are constrained: `draft→running`, `running→completed`, any→`cancelled`; invalid transitions are rejected with the allowed set named. |
| FR-5.4 | Completion requires outcome, primary KPI result, conclusion, learning and next action; an empty `learning` blocks completion. |
| FR-5.5 | A review date earlier than `start_date + experiments.min_duration_days` produces a visible warning at save time, not a hard block. |
| FR-5.6 | An outcome recorded below `metrics.min_results_for_verdict` is labelled *inconclusive by default* and the label is stored in `evidence`. |
| FR-5.7 | The backlog sorts by a computed priority from priority, confidence and effort, and the formula is shown to the user. |
| FR-5.8 | Running experiments display elapsed days and days until review. |
| FR-5.9 | The learning library is searchable by variable, KPI, outcome and free text over conclusion and learning. |
| FR-5.10 | `/today` lists experiments whose `review_date <= today` while `running`. |
| FR-5.11 | `external_refs` accepts campaign/adset/ad ids and URLs and validates their shape. |

**8. Non-functional requirements.** NFR-5.1 Creating an experiment takes one screen and no more than seven required fields — a form that takes five minutes will be abandoned, and an abandoned experiment log is worse than none because it looks like evidence.

**9. Tools / technologies.** Supabase, Next.js server functions, Zod.

**10. Data model changes.** `0005_experiments`: `experiments`, `experiment_results`, index on `(status, review_date)`, search vector over conclusion and learning, RLS.

**11. Backend tasks.** BE-5.1 Migration. BE-5.2 `domain/experiments/state.ts` — transition table, priority score, duration and sample guardrails (pure, fully tested). BE-5.3 `services/experiments` — create, transition, complete, search, race-safe code generation.

**12. Frontend tasks.** FE-5.1 `/experiments` with Backlog / Running / Completed tabs. FE-5.2 Create and edit form with inline guardrail warnings. FE-5.3 `/experiments/[id]` detail with timeline and result panel. FE-5.4 Completion dialog enforcing required fields. FE-5.5 Learning library search. FE-5.6 Today review-queue section.

**13. Integration tasks.** Not applicable in this phase.

**14. Background job tasks.** Not applicable in this phase — the review queue is a query, not a schedule.

**15. Routes / UI.** `/experiments`, `/experiments/new`, `/experiments/[id]`, `/experiments/learnings`, `/today` (review queue).

**16. User flow.** Idea → backlog → promote to running with hypothesis and review date → review date arrives → appears on `/today` → complete with outcome and learning → searchable.

**17. Edge cases.** Two experiments created in the same second · cancelled after partial results · review date in the past at creation · concurrent completion from two tabs · year rollover in the code sequence.

**18. Error handling.** Invalid transitions return `BUSINESS_RULE_REJECTED` listing the allowed transitions.

**19. Security requirements.** Authenticated only; no external exposure.

**20. Testing.** TEST-5.1 transition table exhaustively · TEST-5.2 code uniqueness under concurrency · TEST-5.3 completion validation rejects empty learning · TEST-5.4 priority ordering · TEST-5.5 duration and sample warnings · TEST-5.6 E2E create → run → complete → find in library.

**21. Acceptance criteria.**
- [ ] Full lifecycle works end to end and persists
- [ ] Completion without a learning is impossible
- [ ] The review queue appears on `/today` on the review date
- [ ] Backlog ordering matches the displayed formula
- [ ] Short-duration and small-sample warnings appear
- [ ] Four verification commands pass

**22. Definition of done.** At least one real experiment recorded and completed in the app.

**23. Deliverables.** `0005_experiments`, experiment domain module, services, four UI surfaces, Today section.

**24. Implementation order.** 1) migration → 2) domain state machine + tests → 3) services → 4) list/tabs → 5) create/edit → 6) detail + completion → 7) library search → 8) Today section → 9) E2E.

**25. Completion report.** Standard format, plus the transition table as implemented and the guardrail threshold defaults chosen.

---

## Phase 6 — Lead & Funnel Core

**1. Overview.** The commercial heart: contacts, companies, inquiry-level leads, deals, stage events, the qualification engine and funnel views — all usable with manual and imported data. Activates `/leads`, `/leads/[id]`, `/funnel`.

**2. Objective.** Get the data model and the definition of a qualified lead right **before** any sync exists, so Phase 8 is a transport problem rather than a redesign.

**3. User value.** Every inquiry sits in one place with its attribution, quality verdict and history, and the funnel is visible without a spreadsheet.

**4. Scope.** The five CRM tables · manual lead entry · CSV import with mapping and dry run · qualification engine v1 · manual override with reason · funnel views (cohort and activity) · Today follow-up queue · the KPI formula layer (lead-side metrics; spend-dependent metrics render unavailable).

**5. Out of scope.** Any HubSpot call, any ingest API, spend data, alerts, Slack, decision rules.

**6. Dependencies.** Phases 1 and 2; Phase 3 for the Today section.

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-6.1 | A lead can be created manually; only `occurred_at` and one contact channel are mandatory. |
| FR-6.2 | Creating a lead resolves an existing contact by email, then phone, then creates one; companies resolve by domain, then name. |
| FR-6.3 | A lead with no attribution is stored with `platform='unknown'` and an attribution-missing flag — never rejected. |
| FR-6.4 | `dedupe_key` is deterministic (contact identity + inquiry window + product interest) and prevents storing the same inquiry twice. |
| FR-6.5 | **A repeat inquiry from an existing contact creates a new `leads` row against the same contact**, and the UI states this explicitly. |
| FR-6.6 | The qualification engine runs on every lead creation and produces status, reason codes and `qualification_rule_version`. |
| FR-6.7 | Rules and thresholds come from `app_settings.qualification`; changing a threshold affects future verdicts only. |
| FR-6.8 | A user can override a qualification status with a mandatory reason; the override writes `lead_stage_events` with `source='manual'` and is never auto-reverted. |
| FR-6.9 | Every status change appends a `lead_stage_events` row; the table is append-only. |
| FR-6.10 | CSV import supports column mapping, a dry-run preview with created/updated/skipped counts and row-level errors, and an atomic commit. |
| FR-6.11 | Re-importing the same CSV produces zero duplicates. |
| FR-6.12 | `/leads` filters by status, channel, platform, campaign, date range, attribution completeness and owner, with server-side pagination. |
| FR-6.13 | `/leads/[id]` shows identity, company, requirement, attribution block, the full stage timeline, the linked deal and all flags. |
| FR-6.14 | Deals can be created and edited manually and linked to a lead. |
| FR-6.15 | `/funnel` renders the cohort funnel with counts and conversion rates and states its cohort basis and maturity window on screen. |
| FR-6.16 | Metrics requiring spend render as unavailable (`—`) with an explanation, never as `0`. |

**8. Non-functional requirements.** NFR-6.1 `/leads` returns the first page in ≤ 800 ms at 50,000 rows. NFR-6.2 The qualification engine is pure and deterministic — same input plus same settings yields the same verdict, with no I/O. NFR-6.3 A 5,000-row import completes in ≤ 60 s with progress reporting.

**9. Tools / technologies.** Supabase, Zod, the Phase 1 `DataTable`, a CSV parser.

**10. Data model changes.** `0006_crm_core`: `companies`, `contacts`, `leads`, `lead_stage_events`, `deals`, constraints, indexes, RLS (mirrors writable by service role only). `0007_funnel_views`: `vw_funnel_daily`, `vw_funnel_activity_daily`, `vw_lead_quality_by_campaign`, `vw_attribution_coverage`, with cohort semantics documented in SQL comments.

**11. Backend tasks.** BE-6.1 `0006`. BE-6.2 `0007` views. BE-6.3 `domain/qualification` — rules v1, reason codes, version constant, exhaustive branch tests. BE-6.4 `domain/metrics/formulas.ts` — every formula in §24.1 with null-safety tests. BE-6.5 `domain/attribution/normalise.ts` — email lowercase, Indonesian phone → E.164, UTM trimming, free-provider and competitor lists from settings. BE-6.6 `services/leads` — create, resolve, qualify, override, dedupe, stage events. BE-6.7 CSV import service with mapping, dry run and transactional commit. BE-6.8 `services/deals`.

**12. Frontend tasks.** FE-6.1 Activate `/leads` with URL-synced filters. FE-6.2 `/leads/new`. FE-6.3 `/leads/[id]` detail with timeline, attribution block and flags. FE-6.4 Override dialog. FE-6.5 CSV import wizard (upload → map → dry run → commit → report). FE-6.6 `/funnel` with basis and maturity disclosure. FE-6.7 Today follow-up queue.

**13. Integration tasks.** Not applicable in this phase — deliberately. The domain must be correct before transport exists.

**14. Background job tasks.** Not applicable in this phase.

**15. Routes / UI.** `/leads`, `/leads/new`, `/leads/[id]`, `/leads/import`, `/funnel`, `/today` (follow-up queue).

**16. User flow.** A WhatsApp inquiry arrives → recorded in `/leads/new` → the engine marks it MQL with reasons → it appears in the funnel and on `/today` → sales responds → the status is updated with a reason → the timeline shows the whole history.

**17. Edge cases.** Two contacts sharing a phone number (partial unique index rejects; the UI offers to attach to the existing contact) · no email and no phone (`DQ_NO_CONTACT`, still stored — the volume matters) · a company with no domain · a CSV with wrong encoding or a missing required column (rejected before any write) · a repeat inquiry (correct behaviour, stated in the UI) · timezone-crossing timestamps · `estimated_quantity` of zero versus null.

**18. Error handling.** Import errors are reported per row without aborting the report. A failed dedupe check refuses with `CONFLICT` rather than creating a probable duplicate.

**19. Security requirements.** Lead PII stored but never logged. Mirrors written only through server functions using the service role after session verification. CSV processed in memory, never persisted to storage.

**20. Testing.** TEST-6.1 every qualification branch · TEST-6.2 phone/email normalisation including `08…`, `+62…`, `62…` · TEST-6.3 dedupe key stability and collision behaviour · TEST-6.4 contact/company resolution order · TEST-6.5 repeat inquiry creates a second lead and one contact · TEST-6.6 stage events append-only · TEST-6.7 view correctness against a seeded fixture with a hand-computed funnel · TEST-6.8 cohort versus activity basis produce different, correct numbers on a crafted fixture · TEST-6.9 CSV re-import idempotency · TEST-6.10 every metric formula with zero and null denominators · TEST-6.11 E2E create → qualify → override → funnel reflects it.

**21. Acceptance criteria.**
- [ ] A lead can be created manually and is qualified with visible reasons
- [ ] The same inquiry cannot be stored twice; a genuine repeat inquiry can
- [ ] CSV import of a HubSpot export works, and re-importing changes nothing
- [ ] The funnel matches hand-calculated numbers on the seeded fixture
- [ ] Cohort basis and maturity window are stated on screen
- [ ] Spend-dependent metrics show `—`, not `0`
- [ ] The stage timeline shows every change with actor and source
- [ ] RLS prevents any anon access to `leads`
- [ ] Four verification commands pass

**22. Definition of done.** The operator has entered or imported real leads and can answer "how many MQLs did we get last week, and from where?" without leaving the app. **This closes MVP Core: the product is useful every day with nothing connected.**

**23. Deliverables.** Two migrations, qualification domain, metrics module, normalisation module, lead and deal services, CSV import, four UI surfaces, Today queue.

**24. Implementation order.** 1) `0006` → 2) `0007` views → 3) metrics domain + tests → 4) normalisation + tests → 5) qualification domain + tests → 6) repositories → 7) lead service + tests → 8) leads table → 9) manual entry → 10) detail + timeline → 11) override → 12) CSV import → 13) funnel → 14) Today queue → 15) E2E.

**25. Completion report.** Standard format, plus the qualification rule set as implemented with its version string, the dedupe key definition, and the hand-computed fixture used to verify the funnel views.
---

## Phase 7 — Integration & Background Job Foundation

**1. Overview.** The application-owned infrastructure every external integration reuses: signed ingest endpoints, webhook event persistence, the retry queue, sync state, integration run logging, the job runner and scheduler binding, and `/integrations` v1. This phase **replaces the n8n foundation of v2.0** entirely.

**2. Objective.** One authenticated, idempotent, observable, retryable path for inbound data and one contract for scheduled work — built once, tested once, reused by HubSpot, Meta, Slack dispatch and every future source.

**3. User value.** Leads from landing pages and the WhatsApp gateway arrive automatically; failures are visible and recoverable instead of silent.

**4. Scope.** `POST /api/ingest/lead` with HMAC, replay window, idempotency, size and content-type guards · `webhook_events` as audit log and retry queue · `sync_state` · `integration_runs` · `POST /api/jobs/[job]` with `CRON_SECRET`, advisory lock, bounded batches · job registry · `JOB-RETRY-EVENTS` · `vercel.json` schedule binding · integration health model · `/integrations` v1 with run history, dead-letter list, manual retry and manual job trigger.

**5. Out of scope.** HubSpot, Meta, Slack message content (the Slack client is Phase 9), decision rules, any external orchestration tool.

**6. Dependencies.** Phase 6. **External precondition:** at least one source able to sign requests server-side (Appendix A8), and a scheduler plan that supports the required cadence (Appendix A12).

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-7.1 | `POST /api/ingest/lead` accepts the §23.2 contract validated by Zod; an invalid payload returns 400 with field-level errors and is stored as `webhook_events.status='rejected'`. |
| FR-7.2 | Requests require `X-Signature` (HMAC-SHA256 over `timestamp.method.path.rawBody`), `X-Timestamp` and `Idempotency-Key`; a missing or invalid signature returns 401 and is logged without the body. |
| FR-7.3 | A timestamp outside ±300 s is rejected as a replay. Two secrets (`INGEST_HMAC_SECRET`, `_PREVIOUS`) are accepted during rotation. |
| FR-7.4 | A repeated `Idempotency-Key` returns 200 with the original result and `"replayed": true`, performing no write. |
| FR-7.5 | A successful ingest creates contact/company/lead through the **same service functions as manual entry** — no parallel implementation. |
| FR-7.6 | Every request writes a `webhook_events` row with the raw payload; every processing attempt writes an `integration_runs` row carrying the correlation id. |
| FR-7.7 | Payloads above 256 KB or with a non-JSON content type are rejected before parsing. |
| FR-7.8 | A processing failure classified retryable (§14.2) sets `status='failed'`, increments `attempts`, and schedules `next_retry_at` with backoff; a terminal failure sets `rejected` and is never retried. |
| FR-7.9 | `JOB-RETRY-EVENTS` re-processes due events using `FOR UPDATE SKIP LOCKED`; after `jobs.max_attempts` an event becomes `dead_letter` and raises a `CRITICAL` alert candidate (delivered from Phase 9). |
| FR-7.10 | `POST /api/jobs/[job]` authenticates with `CRON_SECRET` (or an authenticated session for manual triggers), acquires a per-job advisory lock, returns 409 if already running, processes at most `jobs.max_batch` items, and records a run. |
| FR-7.11 | A job failure is recorded and returns 200 `{status:'failed'}`; three consecutive failures of one job produce a `CRITICAL` alert candidate. |
| FR-7.12 | `vercel.json` declares every job's schedule; the same endpoints are callable manually from `/integrations`. |
| FR-7.13 | `/integrations` lists integration runs with status, timing, counts, correlation id and redacted errors; lists dead-lettered events with a "retry now" control; and shows each registered job with last run, last success and a "run now" control. |
| FR-7.14 | Integration health (`healthy` / `degraded` / `failing` / `not_configured`) is computed per §31.1 and rendered through the Phase 1 `IntegrationHealthCard`; the Today data-health strip is activated with these values. |

**8. Non-functional requirements.** NFR-7.1 Ingest responds in ≤ 500 ms p95; long work runs after the event is persisted. NFR-7.2 Correctness under duplicate concurrent delivery is guaranteed by the unique constraint, not by application checks. NFR-7.3 Signature comparison is constant-time. NFR-7.4 Every job has a double-run test proving idempotency per window. NFR-7.5 Jobs stop cleanly before the platform function timeout, leaving a resumable cursor.

**9. Tools / technologies.** Next.js route handlers, Node `crypto`, Zod, Supabase (advisory locks, `SKIP LOCKED`), Vercel Cron.

**10. Data model changes.** `0008_integration_plumbing`: `webhook_events` (with `attempts`, `next_retry_at`, `locked_at`), `sync_state`, `integration_runs` (with `job_key`), indexes, service-role-only RLS; `leads.source_event_id` FK.

**11. Backend tasks.**
- BE-7.1 `0008` migration.
- BE-7.2 `lib/http/hmac.ts` — sign and verify, constant-time, dual-secret rotation, tests for tampered body and stale timestamp.
- BE-7.3 `lib/http/idempotency.ts` — insert-or-return on the unique constraint.
- BE-7.4 `POST /api/ingest/lead` wired to `services/leads`.
- BE-7.5 `services/integration-runs` — start, finish, fail, correlation propagation.
- BE-7.6 `services/jobs/registry.ts`, `services/jobs/runner.ts` — lock, batch bound, budget, run logging.
- BE-7.7 `POST /api/jobs/[job]` dispatcher with dual auth (bearer or session).
- BE-7.8 Retry queue: classify, schedule, claim with `SKIP LOCKED`, dead-letter.
- BE-7.9 `services/integration-health` per §31.1.

**12. Frontend tasks.** FE-7.1 Activate `/integrations`: run history with filters and a detail drawer, dead-letter list with retry, job list with "run now". FE-7.2 Activate the Today data-health strip. All from Phase 1 patterns.

**13. Integration tasks.** INT-7.1 Provide the signing recipe and a reference implementation snippet for the landing-page backend (Apps Script) in `INTEGRATIONS.md`. INT-7.2 Register `INGEST_HMAC_SECRET` with each signing source.

**14. Background job tasks.** JOB-7.1 `JOB-RETRY-EVENTS` (every 10 min). JOB-7.2 `vercel.json` schedule binding with a documented fallback (GitHub Actions scheduled workflow or `pg_cron` + `pg_net`) if the hosting plan's cron granularity is insufficient.

**15. Routes / UI.** `/api/ingest/lead`, `/api/jobs/[job]`, `/api/health`, `/integrations`, `/today` (data-health strip).

**16. User flow.** A landing-page submission is signed by its backend and posted → PM OS validates, stores, qualifies → the lead appears in `/leads` within seconds → the run is visible in `/integrations`. If HubSpot were down (Phase 8), the event would be retried, not lost.

**17. Edge cases.** Duplicate delivery · out-of-order delivery · clock skew at the replay boundary · malformed JSON · oversized payload · valid signature with an invalid body (401 vs 400 must differ) · a source retrying after a 500 that actually succeeded (idempotency key protects) · secret rotation mid-flight · a job invoked twice concurrently (second gets 409) · a job exceeding its time budget (stops with a cursor, not a crash) · the scheduler silently not firing (the data-health self-check in Phase 9 covers it; until then the job list shows "last run" age).

**18. Error handling.** 4xx is terminal; 5xx and network failures are retryable. Every rejection is stored with its reason so "the lead never arrived" is answerable with evidence. A job body throwing past its handler is a bug and is caught by a test.

**19. Security requirements.** Ingest secret distinct from `CRON_SECRET` and Supabase keys. Signing happens server-side at the source; a browser never holds the secret. Failed-signature logs exclude the body. Payload retention 90 days then nulled (`JOB-RETENTION`, Phase 13). Manual triggers require an authenticated session.

**20. Testing.** TEST-7.1 valid signature accepted · TEST-7.2 tampered body rejected · TEST-7.3 stale timestamp rejected · TEST-7.4 duplicate idempotency key returns the original and writes nothing · TEST-7.5 concurrent identical requests create exactly one lead · TEST-7.6 oversized payload rejected · TEST-7.7 job endpoint rejects a wrong secret · TEST-7.8 advisory lock yields 409 on concurrency · TEST-7.9 retryable failure schedules a retry with correct backoff; terminal does not · TEST-7.10 dead-letter after max attempts · TEST-7.11 double-run of `JOB-RETRY-EVENTS` is idempotent · TEST-7.12 integration runs written on success and failure · TEST-7.13 rotation: both secrets accepted, old one rejected after removal.

**21. Acceptance criteria.**
- [ ] A signed test payload creates a lead end to end
- [ ] An unsigned or tampered payload is rejected and logged without PII
- [ ] Sending the same payload ten times creates one lead
- [ ] A forced processing failure is retried with backoff and dead-letters after the limit
- [ ] `/integrations` shows runs, dead letters and jobs with manual controls
- [ ] The scheduled job fires on the declared cadence in the deployed environment
- [ ] Four verification commands pass

**22. Definition of done.** A real landing-page or gateway submission reaches `/leads` automatically, a deliberately broken one is visible in `/integrations`, and a deliberately failed one is recovered by the retry job without human action.

**23. Deliverables.** `0008`, HMAC and idempotency libraries, ingest handler, job runner and dispatcher, retry queue, health service, `vercel.json`, `/integrations` v1, Today data-health strip, `INTEGRATIONS.md` signing recipe.

**24. Implementation order.** 1) migration → 2) HMAC + tests → 3) idempotency + tests → 4) ingest route + tests → 5) integration-run service → 6) job runner + registry + tests → 7) dispatcher → 8) retry queue + tests → 9) health service → 10) `/integrations` UI → 11) `vercel.json` → 12) deployed cadence verification.

**25. Completion report.** Standard format, plus: the confirmed scheduler and its cadence limits, the backoff schedule as implemented, and the signing recipe delivered to the landing-page owner.

---

## Phase 8 — HubSpot CRM Integration

**1. Overview.** Direct, bidirectional-lite sync: HubSpot remains the system of record; PM OS mirrors it and writes only at ingest and qualification. Activates `/integrations/hubspot` and enriches lead detail.

**2. Objective.** Connect acquisition to sales outcome without creating a second CRM.

**3. User value.** Lead stages, deals and revenue appear in PM OS without manual entry, and divergence is visible instead of assumed.

**4. Scope.** HubSpot client with retry, backoff and throttling · configurable mapping layer · contact/company/deal upsert and associations · webhook receiver with HubSpot signature verification · 30-minute cursor-based reconcile · `lead_stage_events` from HubSpot · deal↔lead linkage · owner mapping · narrow, flagged write-back · manual re-sync · HubSpot health.

**5. Out of scope.** Writing deal stage/owner/amount, merging CRM records, custom objects, HubSpot marketing tools, lifecycle write-back unless explicitly enabled.

**6. Dependencies.** Phases 6 and 7. **External preconditions:** A1, A2, A3 (Appendix A).

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-8.1 | A server-side HubSpot client handles auth, bounded retry with backoff, and client-side throttling; it is the only module that calls HubSpot. |
| FR-8.2 | `app_settings.hubspot.mapping` is validated with Zod on read; an invalid mapping disables sync and raises a `CRITICAL` alert rather than syncing with guesses. |
| FR-8.3 | An unmapped lifecycle or deal stage is stored raw, categorised `open`, and raises a `WARNING` alert naming the value; it is never silently mapped. |
| FR-8.4 | Lead ingest creates or updates the HubSpot Contact, associates the Company, and stores `hubspot_contact_id` locally. |
| FR-8.5 | First-touch properties are written to HubSpot only when the corresponding property is empty. |
| FR-8.6 | On MQL, PM OS writes `lead_quality_reason`, `pmos_qualified_at` and `pmos_lead_id`; it writes `lifecycle_stage` only if `hubspot.write_lifecycle_stage` is true (default false). |
| FR-8.7 | `POST /api/ingest/hubspot` verifies HubSpot's request signature, validates the payload, persists it through `webhook_events`, and processes contact and deal events idempotently with retry on failure. |
| FR-8.8 | `JOB-HUBSPOT-RECONCILE` pulls records modified since `sync_state.cursor` minus a 5-minute overlap and upserts them; running it twice changes nothing. |
| FR-8.9 | Any mirrored status change appends `lead_stage_events` with `source='hubspot'`. |
| FR-8.10 | A deal is linked to its originating lead by `pmos_lead_id`, falling back to contact association; an unlinkable deal is stored and flagged, never dropped. |
| FR-8.11 | Contact resolution ambiguity refuses the write with `CONFLICT`, parks the event, and raises a `WARNING` alert for human resolution. |
| FR-8.12 | `/integrations/hubspot` shows health, cursor position, last runs, unmapped values, and offers manual re-sync by date range or record id. |
| FR-8.13 | Won deals are attributed per §23.3 and stamped with `attribution_rule_version`. |

**8. Non-functional requirements.** NFR-8.1 A reconcile of 1,000 modified records completes within one sync window across bounded batches. NFR-8.2 HubSpot downtime degrades health to `failing` without breaking any page. NFR-8.3 No token appears in any log, error or UI.

**9. Tools / technologies.** HubSpot CRM API (private app token), Supabase, Zod, Phase 7 job runner.

**10. Data model changes.** No new tables. `contacts.hubspot_contact_id` and `deals` populated; `sync_state` rows for `hubspot:contacts`, `hubspot:companies`, `hubspot:deals`; `app_settings.hubspot.*` keys.

**11. Backend tasks.** BE-8.1 `integrations/hubspot/client.ts`. BE-8.2 `integrations/hubspot/mapping.ts` — Zod schema, loader, unmapped-value reporting. BE-8.3 `integrations/hubspot/transform.ts` — record → row, tested on committed fixtures. BE-8.4 `services/crm-sync` — upsert, link, stage events, `sync_state`, runs. BE-8.5 `POST /api/ingest/hubspot` with signature verification. BE-8.6 Write-back service, feature-flagged. BE-8.7 Attribution stamping on won deals.

**12. Frontend tasks.** FE-8.1 `/integrations/hubspot` detail. FE-8.2 Lead detail: HubSpot deep link, sync status, divergence indicator. FE-8.3 `/settings` HubSpot mapping editor with validation.

**13. Integration tasks.** INT-8.1 Register the webhook subscriptions in the HubSpot private app. INT-8.2 Record pipeline, stage ids and owner ids into `app_settings`. INT-8.3 Fixtures recorded from real (sandboxed) responses.

**14. Background job tasks.** JOB-8.1 `JOB-HUBSPOT-RECONCILE` (every 30 min), bounded batches, cursor resume.

**15. Routes / UI.** `/api/ingest/hubspot`, `/integrations/hubspot`, `/leads/[id]` (enriched), `/settings` (mapping).

**16. User flow.** Sales moves a deal to Closed Won in HubSpot → within 30 minutes (or seconds via webhook) the deal, its stage and revenue appear in PM OS attributed to the originating campaign, and the funnel updates.

**17. Edge cases.** Webhook before the local contact exists (create, then reconcile) · deleted or merged HubSpot record (flag, never cascade-delete) · multiple associated companies (primary taken, rest flagged) · deal with no contact · rate limiting mid-batch (partial, resume from cursor) · property renamed in HubSpot (mapping validation disables sync loudly) · portal-wide bulk edit producing thousands of events (reconcile absorbs; webhook events queue).

**18. Error handling.** A failed batch records `partial` with `records_failed`; failed ids are re-attempted next run. Three consecutive failures raise `CRITICAL` and set `failing`.

**19. Security requirements.** Minimum scopes. Token server-only. HubSpot webhook signature verified. Portal internals not exposed publicly.

**20. Testing.** TEST-8.1 transform fixtures for contact, company, deal · TEST-8.2 mapping validation rejects malformed config · TEST-8.3 unmapped stage alerts and does not guess · TEST-8.4 reconcile idempotency across the overlap window (double-run) · TEST-8.5 webhook signature verification · TEST-8.6 deal→lead linkage and fallback · TEST-8.7 ambiguity refusal · TEST-8.8 first-touch write-once · TEST-8.9 backoff against a mocked 429 · TEST-8.10 HubSpot down → app renders with degraded health · TEST-8.11 webhook processing failure is retried through the Phase 7 queue.

**21. Acceptance criteria.**
- [ ] A new lead appears in HubSpot with correct attribution properties
- [ ] A stage change in HubSpot appears in PM OS with a stage event
- [ ] Running the reconcile twice changes no data
- [ ] An unmapped stage produces a named alert, not a silent default
- [ ] A won deal is linked to its lead and attributed
- [ ] HubSpot unavailable → health `failing`, app fully usable
- [ ] No token in any log or client bundle
- [ ] Four verification commands pass

**22. Definition of done.** For one full working week, leads and deals in PM OS match HubSpot without manual correction, and any mismatch that occurred is explained by a logged run.

**23. Deliverables.** HubSpot client, mapping, transforms, sync service, webhook and reconcile job, integration detail UI, mapping editor, fixtures.

**24. Implementation order.** 1) client + throttle → 2) mapping + validation → 3) transforms + fixtures → 4) sync service + idempotency tests → 5) reconcile job → 6) webhook receiver → 7) write-back (flagged off) → 8) UI → 9) week-long verification.

**25. Completion report.** Standard format, plus the mapping as configured, the scopes granted, and the write-back flag state.

---

## Phase 9 — Alerts & Slack

**1. Overview.** A first-class alert domain with dedupe, severity and lifecycle, then Slack as its first outbound transport. Activates the Today alert section and the notification panel on `/integrations`.

**2. Objective.** Make failure and opportunity impossible to miss without producing notification fatigue.

**3. User value.** The operator learns about a new MQL, a stale lead or a broken integration without watching dashboards.

**4. Scope.** `alerts` table and lifecycle · deterministic `alert_key` dedupe · severity routing (§20.2) · alert producers for Phase 6–8 conditions · in-app alert centre · Slack client with bounded retry · dispatch job with quiet hours, caps and digests · `JOB-STALE-LEADS`, `JOB-DATA-HEALTH` including the self-check · alert → playbook linking.

**5. Out of scope.** Interactive Slack components, Events API, email or WhatsApp notification, decision-engine verdicts (Phase 11).

**6. Dependencies.** Phases 6 and 7 (Phase 8 for CRM-sourced alerts). **External precondition:** A4.

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-9.1 | An alert is created with a deterministic `alert_key`; re-raising an unresolved alert with the same key increments `occurrence_count` and updates `last_seen_at` instead of inserting. |
| FR-9.2 | Lifecycle: `open → acknowledged → resolved`, plus `suppressed`; transitions record timestamp and reason. |
| FR-9.3 | An alert whose condition no longer holds auto-resolves on the next evaluation with `resolved_reason='condition_cleared'`. |
| FR-9.4 | Severity routing follows §20.2; `info` and rule verdicts stay in-app. |
| FR-9.5 | At most one Slack message per `alert_key` per day; `notification_count` records every send. |
| FR-9.6 | More than five messages of one category within an hour collapse into a digest. |
| FR-9.7 | `info` alerts outside 07:00–20:00 WIB batch into the next morning digest. |
| FR-9.8 | Slack messages contain identifiers and links only — no name, email, phone or message body — enforced by an allowlist serialiser. |
| FR-9.9 | `/today` shows open alerts grouped by severity with acknowledge and snooze. |
| FR-9.10 | An alert type may reference a playbook slug; the alert renders a direct link. |
| FR-9.11 | A Slack delivery failure is recorded on the alert, retried by the dispatch job, and raises an in-app alert after exhaustion; it never blocks the transaction that produced the alert. |
| FR-9.12 | `JOB-DATA-HEALTH` includes a self-check: if any scheduled job has not run within twice its cadence, an alert is raised — silence must mean healthy, not unmonitored. |

**8. Non-functional requirements.** NFR-9.1 Alert evaluation for a day's data completes in ≤ 10 s. NFR-9.2 Notification volume per day per type is visible on `/integrations`. NFR-9.3 Slack outage never delays lead processing.

**9. Tools / technologies.** Supabase, Slack Incoming Webhook, Phase 7 job runner.

**10. Data model changes.** `0009_alerts`: `alerts` with the partial unique index on `alert_key where status <> 'resolved'`, plus `notification_status text check in ('pending','sent','failed','suppressed')` and `notification_attempts int`.

**11. Backend tasks.** BE-9.1 Migration. BE-9.2 `domain/alerts/keys.ts` — deterministic keys per type. BE-9.3 `services/alerts` — raise, refresh, acknowledge, snooze, resolve, auto-resolve sweep. BE-9.4 Producers: new MQL, new SQL, deal won/lost, stale lead, unmapped stage, integration failure and recovery, dead-letter, job failure streak, attribution coverage low, scheduler self-check. BE-9.5 `integrations/slack/client.ts` with bounded retry and allowlist serialiser. BE-9.6 Dispatcher policy: caps, digest collapse, quiet hours.

**12. Frontend tasks.** FE-9.1 Today alert section (activating the Phase 1 `AlertItem`). FE-9.2 Alert detail drawer with evidence, history, playbook link. FE-9.3 Notification-volume panel on `/integrations`.

**13. Integration tasks.** INT-9.1 Slack app, `#pm-alerts` and `#pm-alerts-dev` webhooks; env-specific `SLACK_WEBHOOK_URL`.

**14. Background job tasks.** JOB-9.1 `JOB-STALE-LEADS` (workdays 08:00). JOB-9.2 `JOB-DATA-HEALTH` (hourly, with self-check). JOB-9.3 `JOB-NOTIFY-DISPATCH` (every 5 min).

**15. Routes / UI.** `/today` (alerts), `/integrations` (notification panel).

**16. User flow.** A qualified lead arrives → within the next dispatch pass Slack shows an MQL card with links → the operator opens PM OS → acknowledges → sales acts → the stale alert never fires. If sales does not act, a digest appears two workdays later.

**17. Edge cases.** The same condition firing hourly (dedupe) · resolve and re-fire in one day (one message) · webhook revoked (delivery failed, in-app alert) · quiet-hours boundary mid-batch · alert whose entity was deleted (tombstone reference) · a flood at midnight WIB (digest to morning) · the dispatch job itself failing (self-check catches it).

**18. Error handling.** Delivery retries within bounds, then dead-letters to an in-app `CRITICAL`. A producer exception never aborts the job hosting it.

**19. Security requirements.** No PII in Slack, enforced by a tested allowlist. Webhook URL server-only. Dev and production channels distinct.

**20. Testing.** TEST-9.1 key determinism · TEST-9.2 dedupe increments not inserts · TEST-9.3 auto-resolve · TEST-9.4 daily cap · TEST-9.5 digest collapse · TEST-9.6 quiet-hours batching · TEST-9.7 Slack payload allowlist rejects PII fields · TEST-9.8 delivery failure produces an in-app alert and is retried · TEST-9.9 scheduler self-check fires when a job is overdue · TEST-9.10 double-run of each job is idempotent.

**21. Acceptance criteria.**
- [ ] A new MQL produces exactly one Slack message
- [ ] The same condition re-firing ten times produces one alert row and one message
- [ ] Stale leads arrive as a single daily digest
- [ ] Acknowledge and snooze persist and remove the item from Today
- [ ] No Slack message contains a name, email, phone or message body
- [ ] Slack failure is visible in-app and lead processing is unaffected
- [ ] An overdue job raises an alert
- [ ] Four verification commands pass

**22. Definition of done.** One week of real operation with no duplicate notifications and no missed critical condition.

**23. Deliverables.** `0009`, alert domain and service, producers, Slack client, dispatcher, three jobs, Today and integrations UI.

**24. Implementation order.** 1) migration → 2) key domain + tests → 3) alert service + lifecycle tests → 4) producers → 5) Slack client + serialiser tests → 6) dispatcher policy tests → 7) jobs → 8) UI → 9) one-week observation.

**25. Completion report.** Standard format, plus the alert-type catalogue as implemented with its routing, and the observed notification volume during the observation week.

---

## Phase 10 — Meta Ads & Performance

**1. Overview.** Meta Ads daily ingest into the platform-agnostic fact table, plus the performance surfaces that make spend-based metrics real. Activates `/performance`.

**2. Objective.** Join cost to quality: CPL, CPQL and CPSQL per campaign, with honest freshness and coverage disclosure.

**3. User value.** The operator sees which campaigns produce qualified pipeline, not just cheap leads.

**4. Scope.** `ad_accounts`, `ad_metrics_daily` · Meta connector with 3-day lookback · currency and timezone handling · `/performance` overview and campaign table · campaign→lead join and reconciliation · freshness badges · naming-convention parsing and compliance metric · manual re-ingest.

**5. Out of scope.** Ad-level ingest, GA4, Google Ads, creative dimension analysis, any write to Meta, automated budget action.

**6. Dependencies.** Phases 6 and 7 (Phase 9 for freshness alerts). **External preconditions:** A5, A7.

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-10.1 | Ad accounts are registered with platform, external id, name, currency and timezone. |
| FR-10.2 | `JOB-META-INGEST` ingests the previous day plus a 3-day lookback and upserts on the unique tuple; re-running changes no row count. |
| FR-10.3 | Metrics are stored at campaign grain with `adset_id` and `ad_id` as `''`, preserving the ad-level path without a migration. |
| FR-10.4 | Each row stores `currency` and `source_timezone`; aggregating across differing currencies is refused and raises a data-health alert. |
| FR-10.5 | The Graph API version is pinned in configuration with its verification date. |
| FR-10.6 | Token expiry is tracked; a `WARNING` fires 14 days before. |
| FR-10.7 | `/performance` shows the KPI strip (spend, leads, CPL, MQL, CPQL, SQL, CPSQL, opportunities, revenue) with previous-period comparison, each stating basis, window and freshness, using the Phase 1 `MetricCard`. |
| FR-10.8 | The campaign table lists spend, impressions, clicks, CTR, CPC, CPM, leads, MQL, MQL rate, CPQL with period comparison, sortable and filterable. |
| FR-10.9 | Campaign-to-lead joining uses `lt_campaign` and `campaign_id`; unjoinable spend and unattributed leads are shown as explicit reconciliation lines, never hidden. |
| FR-10.10 | Any metric whose sources are stale beyond SLA renders with a stale badge and the age of the oldest source. |
| FR-10.11 | Campaign and ad names are parsed per §23.5; a naming-compliance percentage is shown on `/integrations`. |
| FR-10.12 | Manual re-ingest for an arbitrary date range is available on `/integrations`. |

**8. Non-functional requirements.** NFR-10.1 A 90-day campaign query returns in ≤ 1 s with 200k rows. NFR-10.2 A 90-day backfill completes across bounded batches with progress. NFR-10.3 Meta downtime affects no non-performance page.

**9. Tools / technologies.** Meta Marketing API (`ads_read`), Supabase, Recharts, Phase 1 `DataTable`/`MetricCard`, Phase 7 job runner.

**10. Data model changes.** `0010_ad_metrics`: `ad_accounts`, `ad_metrics_daily`, indexes, RLS; `vw_lead_quality_by_campaign` becomes fully populated.

**11. Backend tasks.** BE-10.1 Migration. BE-10.2 `integrations/meta/client.ts` — pinned version, insights query, pagination, retry, token expiry read. BE-10.3 `integrations/meta/transform.ts` with fixtures (zero-spend day, missing result type). BE-10.4 `services/ad-metrics` — upsert, lookback restatement, run logging. BE-10.5 `domain/attribution/naming.ts` + compliance metric. BE-10.6 Reconciliation service.

**12. Frontend tasks.** FE-10.1 Activate `/performance` overview: KPI strip, trend chart, funnel. FE-10.2 Campaign table with comparison and column control. FE-10.3 Reconciliation panel. FE-10.4 Stale badges and freshness tooltips.

**13. Integration tasks.** INT-10.1 System user token, account currency and timezone confirmed and recorded.

**14. Background job tasks.** JOB-10.1 `JOB-META-INGEST` (daily 06:00, date-range parameter for backfill).

**15. Routes / UI.** `/performance`, `/performance/meta`, `/integrations` (Meta card, re-ingest).

**16. User flow.** 06:00 the job runs → the operator opens `/performance` → sees yesterday's spend against MQL and CPQL by campaign → drills in → sees that 18% of spend has no matching leads → investigates tracking rather than creative.

**17. Edge cases.** Meta restating a prior day (lookback handles; UI notes recent days may change) · USD account with IDR deals (refuse to combine; show both) · non-WIB account timezone (display offset; never shift silently) · campaign renamed mid-flight (id is key, name is label) · zero-spend day (row of zeros ≠ no row) · token expiring mid-job · campaign with spend but no leads and vice versa.

**18. Error handling.** Partial ingest marks `partial`, records failed date/account pairs, retries them next run. A failed ingest never deletes previously good rows.

**19. Security requirements.** `ads_read` only. Token server-side. No account id or token in client state beyond the display name.

**20. Testing.** TEST-10.1 transform fixtures · TEST-10.2 upsert idempotency across the lookback (double-run) · TEST-10.3 currency mismatch refusal · TEST-10.4 timezone metadata preserved · TEST-10.5 naming parser across valid and invalid names · TEST-10.6 campaign-lead join and reconciliation arithmetic on a fixture · TEST-10.7 stale badge past SLA · TEST-10.8 `/performance` renders with zero ad data.

**21. Acceptance criteria.**
- [ ] Yesterday's Meta spend appears by 07:00 WIB
- [ ] Re-running ingest for the same range changes nothing
- [ ] CPQL per campaign matches a hand calculation on a fixture
- [ ] Unjoined spend and unattributed leads are both displayed
- [ ] Mixed currencies are refused with an alert
- [ ] Stale data is badged with its age
- [ ] Four verification commands pass

**22. Definition of done.** For one week `/performance` answers "which campaign produced qualified pipeline at what cost?" without a spreadsheet, with reconciliation visible. **This closes MVP Integration.**

**23. Deliverables.** `0010`, Meta client and transforms, ingest service and job, naming parser, reconciliation service, performance surfaces.

**24. Implementation order.** 1) migration → 2) client → 3) transform + fixtures → 4) ingest service + tests → 5) job → 6) naming parser → 7) reconciliation → 8) overview → 9) campaign table → 10) freshness badges → 11) deployed cadence verification.

**25. Completion report.** Standard format, plus the pinned API version and verification date, the account currency and timezone as confirmed, and the naming-compliance rate observed.

---

## Phase 11 — Decision Engine & Today v2

**1. Overview.** The deterministic rule set of §29, its evidence trail, and the priority-ranked action list that completes `/today`.

**2. Objective.** Turn data into a ranked, explainable set of actions — and refuse to recommend when the data cannot support it.

**3. User value.** The operator opens `/today` and sees the three to five things that matter, each with the numbers behind it.

**4. Scope.** Rule engine with versioned rules `R-00`–`R-10` · `rule_evaluations` · data-quality gates (stale, incomplete, missing, mixed currency, low coverage) · priority scoring · Today priority actions · snooze and dismiss with reasons · threshold configuration in `/settings`.

**5. Out of scope.** AI recommendations, automatic campaign changes, per-creative verdicts, budget calculation, forecasting.

**6. Dependencies.** Phases 6, 9, 10. **External precondition:** A11 (target CPQL).

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-11.1 | Every evaluation writes a `rule_evaluations` row including `SUPPRESSED` and `MONITOR` outcomes, so silence is explainable. |
| FR-11.2 | `R-00` runs first; when it fires (stale source, coverage below threshold, mixed currency, missing inputs), all campaign-scoped rules return `SUPPRESSED` and the surfaced action is "fix measurement", naming the cause. |
| FR-11.3 | `R-01` blocks `SCALE_CANDIDATE` and `PAUSE_CANDIDATE` on insufficient sample but never blocks `INVESTIGATE`. |
| FR-11.4 | Rules `R-02`–`R-10` are implemented exactly as §29.2 with thresholds from `app_settings`; in particular, CPL rising while MQL rate and CPQL improve yields `HOLD`, never `PAUSE_CANDIDATE`. |
| FR-11.5 | Every surfaced recommendation shows rule and version, condition, evidence with actual numbers, comparison basis, window, verdict and limitations. |
| FR-11.6 | `/today` shows at most five priority actions ranked by §29.3, with score inputs visible on hover. |
| FR-11.7 | An action can be snoozed with a duration or dismissed with a reason; both persist and are respected by the next evaluation. |
| FR-11.8 | An item dismissed three or more times within 30 days is flagged in `/settings` as a candidate rule change. |
| FR-11.9 | Thresholds are editable in `/settings` with validation, defaults and reset; changes are audited. |
| FR-11.10 | Changing `rule_version` does not alter historical evaluations. |

**8. Non-functional requirements.** NFR-11.1 Full daily evaluation completes in ≤ 30 s within bounded batches. NFR-11.2 Rules are pure functions of `(metrics, settings, clock)` with no I/O.

**9. Tools / technologies.** Supabase, Phase 7 job runner.

**10. Data model changes.** `0011_rule_evaluations`; `app_settings` gains `rules.*`, `health.*`, `metrics.*`; an `action_dismissals` structure is stored on `alerts` (snooze_until, dismissed_reason, dismissal_count) — no new table.

**11. Backend tasks.** BE-11.1 Migration. BE-11.2 `domain/rules/` — one file per rule, registry, version constant, shared types. BE-11.3 `domain/rules/priority.ts`. BE-11.4 `services/decisions` — gather inputs, evaluate, persist, raise alerts for critical verdicts. BE-11.5 Snooze/dismiss persistence and dismissal-frequency reporting.

**12. Frontend tasks.** FE-11.1 Today priority-actions section with evidence disclosure. FE-11.2 Suppression banner. FE-11.3 `/settings` threshold editor grouped by rule. FE-11.4 Rule-evaluation history per campaign on `/performance/meta`.

**13. Integration tasks.** Not applicable in this phase.

**14. Background job tasks.** JOB-11.1 `JOB-EVALUATE-RULES` (daily 07:00).

**15. Routes / UI.** `/today`, `/settings`, `/performance/meta` (history).

**16. User flow.** 07:00 rules run → `/today` shows "Campaign X: spend 3× target CPQL with zero MQL — PAUSE CANDIDATE" with numbers → the operator confirms and pauses it **in Meta** → records an experiment. Or: "Recommendations suppressed — Meta data is 31 hours stale" → the operator fixes the pipeline instead.

**17. Edge cases.** A new campaign with two days of data (`MONITOR`) · spend with no lead join (`R-06` before any quality verdict) · contradictory rules (documented precedence: gate → tracking → quality → scale) · all rules suppressed (Today explains why) · absurd threshold (validation bounds) · a snoozed item whose condition worsens materially (snooze overridden, stated).

**18. Error handling.** A failing rule is recorded as an evaluation error and does not abort the rest. Missing inputs produce `SUPPRESSED`, never a guess.

**19. Security requirements.** Threshold changes audited. `domain/rules` imports nothing outside itself, so no rule can reach an external write API.

**20. Testing.** TEST-11.1 one fixture per rule, firing and not firing · TEST-11.2 gate suppression cascade, including mixed currency · TEST-11.3 sample gate blocks scale/pause only · TEST-11.4 precedence on contradictions · TEST-11.5 priority ordering · TEST-11.6 snooze and dismiss · TEST-11.7 evaluations written for suppressed outcomes · TEST-11.8 the CPL-up/CPQL-down case yields `HOLD` · TEST-11.9 E2E stale data → suppression banner.

**21. Acceptance criteria.**
- [ ] All eleven rules behave exactly as specified on fixtures
- [ ] Stale, low-coverage or mixed-currency data suppresses verdicts with a stated reason
- [ ] CPL up with improving CPQL never produces a pause recommendation
- [ ] Priority actions are ranked, capped at five, and show their evidence
- [ ] Every evaluation is recorded, including suppressions
- [ ] Thresholds are editable, validated and audited
- [ ] No rule can modify anything in an ad platform
- [ ] Four verification commands pass

**22. Definition of done.** For one week the Today priority list is acted on or consciously dismissed, and no recommendation was made on data the system could not support.

**23. Deliverables.** `0011`, rule modules, priority scoring, decision service, job, Today v2, settings editor, evaluation history.

**24. Implementation order.** 1) migration → 2) rule types + registry → 3) rules one by one with fixtures → 4) priority scoring → 5) decision service → 6) job → 7) Today section → 8) suppression banner → 9) settings editor → 10) history → 11) week-long observation.

**25. Completion report.** Standard format, plus the threshold values configured and the count of evaluations by verdict during the observation week.

---

## Phase 12 — Reporting

**1. Overview.** Assemble a weekly report from data already captured, let the operator edit the narrative, then freeze it. Activates `/reports`.

**2. Objective.** End the week in fifteen minutes with a document that stays reproducible.

**3. User value.** A presentable report for the VP Marketing without re-typing numbers.

**4. Scope.** Weekly aggregation · facts JSON assembly · editable draft · finalisation with immutable snapshot and version · Markdown export and print view · Slack "report ready" · mandatory data-quality caveats · revenue/ROAS included only when outcome completeness passes the gate.

**5. Out of scope.** AI narrative, monthly and quarterly reports (structure allows `type='monthly'`; not built), scheduled email, embedded charts in export, external sharing links.

**6. Dependencies.** Phases 3, 5, 6, 10, 11. Open Question 6 (export format).

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-12.1 | A weekly report can be generated for any ISO week (Monday–Sunday, Asia/Jakarta), past or current. |
| FR-12.2 | Generation assembles metrics with previous-week comparison, experiments completed and running with learnings, workflow completion rate, notes, unresolved alerts, campaign observations, issues, next actions and data-health status. |
| FR-12.3 | The facts JSON is the single input to rendering; the UI never recomputes a metric at display time. |
| FR-12.4 | The draft is editable in narrative sections only; fact tables are read-only. |
| FR-12.5 | The data-quality caveats section is always present with attribution coverage, outcome completeness and stale sources. |
| FR-12.6 | Revenue, ROAS and CAC appear only when `R-09` did not suppress them for the period; otherwise the section states why. |
| FR-12.7 | Finalising freezes `facts` and `narrative_md`, sets `finalized_at`/`finalized_by`, and is enforced immutable at the database level. |
| FR-12.8 | Regenerating a finalised week creates `version + 1`; it never mutates the existing row. Exports as Markdown and renders print-ready. |
| FR-12.9 | Finalisation posts a Slack message with the link and headline metrics. |

**8. Non-functional requirements.** NFR-12.1 Generation ≤ 10 s for a week with 1,000 leads. NFR-12.2 A report finalised today renders identically in six months regardless of later restatement.

**9. Tools / technologies.** Supabase, Next.js server functions, Slack client (Phase 9), Phase 7 job runner.

**10. Data model changes.** `0012_reports`: `reports` with a trigger refusing updates where `status='final'`.

**11. Backend tasks.** BE-12.1 Migration with immutability trigger. BE-12.2 `services/reports/assemble.ts` — Zod-validated facts schema. BE-12.3 Finalisation and versioning. BE-12.4 Markdown exporter.

**12. Frontend tasks.** FE-12.1 Activate `/reports` list. FE-12.2 `/reports/[id]` draft editor with read-only facts. FE-12.3 Print-ready view and export control.

**13. Integration tasks.** Not applicable in this phase.

**14. Background job tasks.** JOB-12.1 `JOB-WEEKLY-REPORT` (Monday 07:30) pre-generates the draft and notifies Slack.

**15. Routes / UI.** `/reports`, `/reports/[id]`.

**16. User flow.** Monday morning → a draft exists → the operator reviews facts, writes three sentences of interpretation and next week's priorities → finalises → shares the export with the VP Marketing.

**17. Edge cases.** A week with no spend · zero leads (report generates and says so) · regenerating after HubSpot restated deals (new version) · the current incomplete week (labelled partial) · a month-boundary week · the first week ever with no comparison period.

**18. Error handling.** A missing input section renders "not available" with the reason; it never blocks generation. An assembly failure leaves no partial row.

**19. Security requirements.** Aggregate revenue permitted, no contact PII. Exports generated server-side for the authenticated user; no public link.

**20. Testing.** TEST-12.1 assembly against a seeded week with hand-computed values · TEST-12.2 immutability after finalisation (update attempt fails at the database) · TEST-12.3 versioning on regeneration · TEST-12.4 caveats always present · TEST-12.5 revenue section suppressed when completeness fails · TEST-12.6 empty-week generation · TEST-12.7 Markdown export structure · TEST-12.8 E2E generate → edit → finalise → export.

**21. Acceptance criteria.**
- [ ] A weekly report generates with correct numbers on the fixture
- [ ] Narrative is editable; facts are not
- [ ] Finalised reports cannot be modified, even by a direct update
- [ ] Regeneration creates a new version and preserves the old
- [ ] Caveats are always present with real figures
- [ ] Revenue is withheld when outcome completeness is below threshold
- [ ] Export is presentable without editing
- [ ] Four verification commands pass

**22. Definition of done.** Two consecutive real weekly reports produced in the app, each in under fifteen minutes of manual work.

**23. Deliverables.** `0012`, assembly service, immutability trigger, exporter, report UI, job.

**24. Implementation order.** 1) migration + trigger → 2) facts schema → 3) assembly + tests → 4) list/detail UI → 5) narrative editor → 6) finalisation → 7) exporter → 8) job + Slack → 9) E2E.

**25. Completion report.** Standard format, plus the facts schema version and the export format confirmed with the report's audience.

---

## Phase 13 — Production Hardening

**1. Overview.** Make the system safe to depend on: verified backups, an audited security posture, E2E coverage of critical paths, retention, and a documented production cutover. Completes `/integrations`.

**2. Objective.** Move from "works in dev" to "system of record for daily operations".

**3. User value.** The operator can trust the data and recover from a bad day.

**4. Scope.** Production Supabase project and migration path · RLS and authorization audit · secret-exposure audit · webhook security suite · PII and logging audit · integration resilience and retry/recovery verification · observability and failure visibility · backup restore drill · production env validation · accessibility and performance verification · critical E2E · threat cases · `JOB-RETENTION` · runbook · deployment documentation and cutover.

**5. Out of scope.** New product features, unless required to fix a production-readiness finding.

**6. Dependencies.** All prior phases.

**7. Functional requirements**

| ID | Requirement |
|---|---|
| FR-13.1 | An automated script asserts every `public` table has RLS enabled and at least one policy, and fails CI otherwise. |
| FR-13.2 | An automated check asserts that no service-role key, HubSpot token, Slack webhook, ingest secret or `CRON_SECRET` appears in the client bundle or repository history. |
| FR-13.3 | All threat cases in §32 have an executable test or a signed-off manual checklist entry. |
| FR-13.4 | A backup restore drill is performed into a scratch project and documented with date, duration and outcome. |
| FR-13.5 | Playwright covers: login, daily checklist, manual lead creation and qualification, experiment lifecycle, report generation and finalisation, and one failure path per integration (HubSpot down, Meta down, Slack down, scheduler silent). |
| FR-13.6 | `/integrations` is complete: every integration and every job with status, SLA, last run, last success, failure count, manual actions and recent redacted errors. |
| FR-13.7 | `JOB-RETENTION` nulls `webhook_events.payload` older than 90 days and prunes `integration_runs` older than 12 months. |
| FR-13.8 | `RUNBOOK.md` documents rotating each secret, re-syncing each integration, re-running each job, restoring from backup, responding to each `CRITICAL` alert type, and what to do if the scheduler stops. |
| FR-13.9 | Production environment variables are configured separately; the badge proves which environment is in use; `vercel.json` production schedules are verified firing. |
| FR-13.10 | Slow-query review against production-like volume; missing indexes added by migration; NFR-G1 targets verified. |

**8. Non-functional requirements.** NFR-13.1 Zero `CRITICAL` findings open at the gate. NFR-13.2 Deployment is repeatable from a checklist. NFR-13.3 Axe zero critical on every activated route.

**9. Tools / technologies.** Playwright, Supabase CLI, GitHub Actions, Vercel, axe.

**10. Data model changes.** No new tables; index migrations only, based on measured slow queries.

**11. Backend tasks.** BE-13.1 RLS audit script in CI. BE-13.2 Secret scan of build output and history in CI. BE-13.3 Security test suite for §32. BE-13.4 Production Supabase project; all migrations applied from zero. BE-13.5 Restore drill. BE-13.6 Slow-query review and index migrations. BE-13.7 PII log audit script (grep logs for email/phone patterns in a test run).

**12. Frontend tasks.** FE-13.1 Complete `/integrations`. FE-13.2 Global error boundary and 404/500 pages within the shell. FE-13.3 Accessibility pass on all activated routes.

**13. Integration tasks.** INT-13.1 Production deployment: env, domain, HSTS, production Slack channel, production HubSpot webhook URL, production Meta token. INT-13.2 `RUNBOOK.md`. INT-13.3 Cutover checklist executed and recorded.

**14. Background job tasks.** JOB-13.1 `JOB-RETENTION` (daily 02:00). JOB-13.2 Verify every production schedule fired at least once and is visible in `/integrations`.

**15. Routes / UI.** `/integrations` (complete), error pages.

**16. User flow.** The operator works in production with confidence; when something breaks, `/integrations` names it and the runbook says what to do.

**17. Edge cases.** A migration behaving differently on an empty production database · production webhooks still pointing at dev URLs · a secret rotated in one place but not another · a restore that succeeds with stale sequences · the scheduler plan silently downgraded.

**18. Error handling.** Every unhandled error renders the branded error page with a correlation id the operator can quote.

**19. Security requirements.** The full §32 checklist executed and signed off. Any open `CRITICAL` finding blocks the gate.

**20. Testing.** TEST-13.1 RLS audit · TEST-13.2 secret scan · TEST-13.3 forged signature · TEST-13.4 replay · TEST-13.5 job endpoint without secret · TEST-13.6 anon read of `leads` denied · TEST-13.7 E2E critical paths · TEST-13.8 each integration and scheduler failure path renders a usable page · TEST-13.9 retention job double-run idempotent · TEST-13.10 restore drill documented.

**21. Acceptance criteria.**
- [ ] RLS audit and secret scan pass in CI
- [ ] All §32 threat cases tested or signed off
- [ ] Backup restored in a drill, with evidence
- [ ] E2E critical paths and four failure paths green
- [ ] `/integrations` complete for every integration and job
- [ ] `RUNBOOK.md` covers rotation, re-sync, jobs, restore, every `CRITICAL` alert, scheduler outage
- [ ] Production deployed, badge shows `PROD`, schedules verified
- [ ] Four verification commands pass

**22. Definition of done.** PM OS is the system used for daily work in production, with a verified recovery path and no open critical security findings.

**23. Deliverables.** Audit scripts, security tests, E2E suite, production project and deployment, `RUNBOOK.md`, retention job, index migrations, cutover record.

**24. Implementation order.** 1) RLS audit → 2) secret scan → 3) security tests → 4) E2E suite → 5) `/integrations` completion → 6) error pages → 7) accessibility pass → 8) production project + migrations → 9) restore drill → 10) slow-query review → 11) retention job → 12) runbook → 13) cutover.

**25. Completion report.** Standard format, plus the restore drill record, the cutover checklist as executed, and the list of production schedules with their first observed run.
---

## 36. Requirements Traceability Matrix

Status values: `Planned` · `In Progress` · `Implemented` · `Verified`. The coding agent updates this table at the end of every phase; a phase gate cannot pass while any of its requirements is below `Verified`. 154 requirements across 14 phases.

| Requirement | Phase | Component | Test | Status |
|---|---|---|---|---|
| FR-0.1 | 0 | app scaffold | TEST-0.3 | Planned |
| FR-0.2 | 0 | lib/env | TEST-0.1 | Planned |
| FR-0.3 | 0 | lib/env.server | TEST-0.1 | Planned |
| FR-0.4 | 0 | package scripts | TEST-0.4 | Planned |
| FR-0.5 | 0 | CI workflow | TEST-0.4 | Planned |
| FR-0.6 | 0 | control docs | manual | Planned |
| FR-1.1 | 1 | design tokens | TEST-1.7 | Planned |
| FR-1.2 | 1 | status tokens | TEST-1.6 | Planned |
| FR-1.3 | 1 | StatusBadge | TEST-1.6 | Planned |
| FR-1.4 | 1 | app shell | TEST-1.1 | Planned |
| FR-1.5 | 1 | responsive layout | TEST-1.3 | Planned |
| FR-1.6 | 1 | route skeletons | TEST-1.1 | Planned |
| FR-1.7 | 1 | unactivated states | TEST-1.1 | Planned |
| FR-1.8 | 1 | no-fake-data rule | TEST-1.1 + review | Planned |
| FR-1.9 | 1 | state components | TEST-1.1 | Planned |
| FR-1.10 | 1 | DataTable | TEST-1.4 | Planned |
| FR-1.11 | 1 | FilterBar | TEST-1.5 | Planned |
| FR-1.12 | 1 | accessibility baseline | TEST-1.2 | Planned |
| FR-2.1 | 2 | auth actions | TEST-2.5 | Planned |
| FR-2.2 | 2 | middleware | TEST-2.1 | Planned |
| FR-2.3 | 2 | Supabase console config | manual | Planned |
| FR-2.4 | 2 | handle_new_user | TEST-2.3 | Planned |
| FR-2.5 | 2 | sign-out | TEST-2.5 | Planned |
| FR-2.6 | 2 | RLS policies | TEST-2.3 | Planned |
| FR-2.7 | 2 | settings service | TEST-2.4 | Planned |
| FR-2.8 | 2 | settings fallback | TEST-2.4 | Planned |
| FR-2.9 | 2 | lib/auth/can | TEST-2.5 | Planned |
| FR-2.10 | 2 | env badge / bundle | TEST-2.6 | Planned |
| FR-3.1 | 3 | seed migration | TEST-3.2 | Verified |
| FR-3.2 | 3 | services/workflows | TEST-3.1 | Verified |
| FR-3.3 | 3 | checklist component | TEST-3.6 | Verified |
| FR-3.4 | 3 | checklist notes | TEST-3.6 | Verified |
| FR-3.5 | 3 | recomputeRunStatus | TEST-3.4 | Verified |
| FR-3.6 | 3 | label_snapshot | TEST-3.5 | Verified |
| FR-3.7 | 3 | template editor | TEST-3.6 | Verified |
| FR-3.8 | 3 | deactivation | TEST-3.2 | Verified |
| FR-3.9 | 3 | services/notes | TEST-3.6 | Verified |
| FR-3.10 | 3 | /workflows | TEST-3.6 | Verified |
| FR-3.11 | 3 | domain/dates | TEST-3.3 | Verified |
| FR-4.1 | 4 | services/playbook | TEST-4.5 | Verified |
| FR-4.2 | 4 | slug generator | TEST-4.1 | Verified |
| FR-4.3 | 4 | markdown renderer | TEST-4.4 | Verified |
| FR-4.4 | 4 | search vector | TEST-4.2 | Verified |
| FR-4.5 | 4 | filters | TEST-4.5 | Verified |
| FR-4.6 | 4 | publish action | TEST-4.3 | Verified |
| FR-4.7 | 4 | archive handling | TEST-4.3 | Verified |
| FR-4.8 | 4 | seed migration | manual | Verified |
| FR-5.1 | 5 | experiment form | TEST-5.6 | Planned |
| FR-5.2 | 5 | code generator | TEST-5.2 | Planned |
| FR-5.3 | 5 | domain/experiments/state | TEST-5.1 | Planned |
| FR-5.4 | 5 | completion dialog | TEST-5.3 | Planned |
| FR-5.5 | 5 | duration guardrail | TEST-5.5 | Planned |
| FR-5.6 | 5 | sample guardrail | TEST-5.5 | Planned |
| FR-5.7 | 5 | priority score | TEST-5.4 | Planned |
| FR-5.8 | 5 | running view | TEST-5.6 | Planned |
| FR-5.9 | 5 | learning search | TEST-5.6 | Planned |
| FR-5.10 | 5 | Today review queue | TEST-5.6 | Planned |
| FR-5.11 | 5 | external_refs schema | TEST-5.1 | Planned |
| FR-6.1 | 6 | /leads/new | TEST-6.11 | Planned |
| FR-6.2 | 6 | contact/company resolve | TEST-6.4 | Planned |
| FR-6.3 | 6 | unattributed lead | TEST-6.1 | Planned |
| FR-6.4 | 6 | dedupe key | TEST-6.3 | Planned |
| FR-6.5 | 6 | repeat inquiry | TEST-6.5 | Planned |
| FR-6.6 | 6 | domain/qualification | TEST-6.1 | Planned |
| FR-6.7 | 6 | settings loader | TEST-6.1 | Planned |
| FR-6.8 | 6 | override dialog | TEST-6.6 | Planned |
| FR-6.9 | 6 | lead_stage_events | TEST-6.6 | Planned |
| FR-6.10 | 6 | CSV import | TEST-6.9 | Planned |
| FR-6.11 | 6 | CSV idempotency | TEST-6.9 | Planned |
| FR-6.12 | 6 | /leads table | TEST-6.11 | Planned |
| FR-6.13 | 6 | /leads/[id] | TEST-6.11 | Planned |
| FR-6.14 | 6 | services/deals | TEST-6.7 | Planned |
| FR-6.15 | 6 | /funnel + views | TEST-6.7, 6.8 | Planned |
| FR-6.16 | 6 | metric formatter | TEST-6.10 | Planned |
| FR-7.1 | 7 | ingest route | TEST-7.1 | Planned |
| FR-7.2 | 7 | lib/http/hmac | TEST-7.2 | Planned |
| FR-7.3 | 7 | replay window + rotation | TEST-7.3, 7.13 | Planned |
| FR-7.4 | 7 | idempotency lib | TEST-7.4 | Planned |
| FR-7.5 | 7 | shared lead service | TEST-7.5 | Planned |
| FR-7.6 | 7 | webhook_events, runs | TEST-7.12 | Planned |
| FR-7.7 | 7 | payload guard | TEST-7.6 | Planned |
| FR-7.8 | 7 | retry classification | TEST-7.9 | Planned |
| FR-7.9 | 7 | JOB-RETRY-EVENTS | TEST-7.10, 7.11 | Planned |
| FR-7.10 | 7 | job dispatcher + lock | TEST-7.7, 7.8 | Planned |
| FR-7.11 | 7 | job failure recording | TEST-7.12 | Planned |
| FR-7.12 | 7 | vercel.json | deployed check | Planned |
| FR-7.13 | 7 | /integrations v1 | TEST-7.12 | Planned |
| FR-7.14 | 7 | integration-health service | TEST-7.12 | Planned |
| FR-8.1 | 8 | HubSpot client | TEST-8.9 | Planned |
| FR-8.2 | 8 | mapping loader | TEST-8.2 | Planned |
| FR-8.3 | 8 | unmapped handling | TEST-8.3 | Planned |
| FR-8.4 | 8 | crm-sync upsert | TEST-8.1 | Planned |
| FR-8.5 | 8 | first-touch write-once | TEST-8.8 | Planned |
| FR-8.6 | 8 | write-back service | TEST-8.8 | Planned |
| FR-8.7 | 8 | HubSpot webhook route | TEST-8.5, 8.11 | Planned |
| FR-8.8 | 8 | JOB-HUBSPOT-RECONCILE | TEST-8.4 | Planned |
| FR-8.9 | 8 | stage event writer | TEST-8.6 | Planned |
| FR-8.10 | 8 | deal linkage | TEST-8.6 | Planned |
| FR-8.11 | 8 | resolution guard | TEST-8.7 | Planned |
| FR-8.12 | 8 | /integrations/hubspot | TEST-8.10 | Planned |
| FR-8.13 | 8 | attribution stamping | TEST-8.6 | Planned |
| FR-9.1 | 9 | domain/alerts/keys | TEST-9.1, 9.2 | Planned |
| FR-9.2 | 9 | alert service | TEST-9.3 | Planned |
| FR-9.3 | 9 | auto-resolve | TEST-9.3 | Planned |
| FR-9.4 | 9 | dispatcher policy | TEST-9.4 | Planned |
| FR-9.5 | 9 | daily cap | TEST-9.4 | Planned |
| FR-9.6 | 9 | digest collapse | TEST-9.5 | Planned |
| FR-9.7 | 9 | quiet hours | TEST-9.6 | Planned |
| FR-9.8 | 9 | Slack serialiser | TEST-9.7 | Planned |
| FR-9.9 | 9 | Today alert section | TEST-9.3 | Planned |
| FR-9.10 | 9 | alert→playbook link | manual | Planned |
| FR-9.11 | 9 | delivery failure path | TEST-9.8 | Planned |
| FR-9.12 | 9 | scheduler self-check | TEST-9.9 | Planned |
| FR-10.1 | 10 | ad_accounts | TEST-10.4 | Planned |
| FR-10.2 | 10 | JOB-META-INGEST | TEST-10.2 | Planned |
| FR-10.3 | 10 | ad_metrics_daily grain | TEST-10.2 | Planned |
| FR-10.4 | 10 | currency guard | TEST-10.3 | Planned |
| FR-10.5 | 10 | config/integrations | manual | Planned |
| FR-10.6 | 10 | token expiry check | TEST-10.8 | Planned |
| FR-10.7 | 10 | /performance | TEST-10.6 | Planned |
| FR-10.8 | 10 | campaign table | TEST-10.6 | Planned |
| FR-10.9 | 10 | reconciliation | TEST-10.6 | Planned |
| FR-10.10 | 10 | freshness badge | TEST-10.7 | Planned |
| FR-10.11 | 10 | naming parser | TEST-10.5 | Planned |
| FR-10.12 | 10 | manual re-ingest | manual | Planned |
| FR-11.1 | 11 | rule_evaluations | TEST-11.7 | Verified (local; TASKS.md) |
| FR-11.2 | 11 | gate rule R-00 | TEST-11.2 | Verified (local; TASKS.md) |
| FR-11.3 | 11 | sample rule R-01 | TEST-11.3 | Verified (local; TASKS.md) |
| FR-11.4 | 11 | domain/rules/* | TEST-11.1, 11.8 | Verified (local; A11 per D-018) |
| FR-11.5 | 11 | evidence renderer | TEST-11.1 | Verified (local; TASKS.md) |
| FR-11.6 | 11 | priority section | TEST-11.5 | Verified (local; TASKS.md) |
| FR-11.7 | 11 | snooze/dismiss | TEST-11.6 | Verified (local; TASKS.md) |
| FR-11.8 | 11 | dismissal report | TEST-11.6 | Verified (local; TASKS.md) |
| FR-11.9 | 11 | settings editor | TEST-11.1 | Verified (local; TASKS.md) |
| FR-11.10 | 11 | rule versioning | TEST-11.7 | Verified (local; TASKS.md) |
| FR-12.1 | 12 | assembly service | TEST-12.1 | Planned |
| FR-12.2 | 12 | assembly inputs | TEST-12.1 | Planned |
| FR-12.3 | 12 | facts schema | TEST-12.1 | Planned |
| FR-12.4 | 12 | draft editor | TEST-12.8 | Planned |
| FR-12.5 | 12 | caveats section | TEST-12.4 | Planned |
| FR-12.6 | 12 | revenue gate | TEST-12.5 | Planned |
| FR-12.7 | 12 | immutability trigger | TEST-12.2 | Planned |
| FR-12.8 | 12 | versioning + export | TEST-12.3, 12.7 | Planned |
| FR-12.9 | 12 | Slack notify | TEST-12.8 | Planned |
| FR-13.1 | 13 | RLS audit script | TEST-13.1 | Planned |
| FR-13.2 | 13 | secret scan | TEST-13.2 | Planned |
| FR-13.3 | 13 | security suite | TEST-13.3–13.6 | Planned |
| FR-13.4 | 13 | restore drill | TEST-13.10 | Planned |
| FR-13.5 | 13 | E2E suite | TEST-13.7, 13.8 | Planned |
| FR-13.6 | 13 | /integrations complete | TEST-13.8 | Planned |
| FR-13.7 | 13 | JOB-RETENTION | TEST-13.9 | Planned |
| FR-13.8 | 13 | RUNBOOK.md | manual | Planned |
| FR-13.9 | 13 | env separation + schedules | manual | Planned |
| FR-13.10 | 13 | index migrations | manual | Planned |

---

## 37. Deployment Strategy

| Environment | App | Database | Scheduler | Slack channel | Purpose |
|---|---|---|---|---|---|
| Local | `npm run dev` | Supabase dev project | manual triggers only | `#pm-alerts-dev` | Development |
| Preview | Vercel preview per PR, deployment-protected | Supabase dev project | **disabled** (no cron on previews) | `#pm-alerts-dev` | Review |
| Production | Vercel production | **Separate Supabase production project** | Vercel Cron per `vercel.json` | `#pm-alerts` | Daily operation |

Rules:
1. The production Supabase project is created at Phase 13, not earlier. Real lead PII never lives in the development project.
2. Migrations are applied forward-only through the Supabase CLI, from an empty database, in order. Building production from zero is verified in Phase 13.
3. Deployment is triggered from `main` after CI passes. No manual deploys from a laptop.
4. Rollback: revert the commit and redeploy. Schema migrations are forward-only; a schema mistake is fixed with a new migration.
5. Scheduled jobs run **only** in production. Preview and local environments trigger jobs manually from `/integrations`. This prevents two environments ingesting the same Meta account or answering the same HubSpot webhook.
6. External systems (HubSpot webhook subscription, landing-page backend, WhatsApp gateway) are pointed at the production URL as an explicit cutover-checklist item, because "the webhook still points at preview" is the most likely production incident in this architecture.
7. Phase 1 builds are never publicly reachable (§17).

---

## 38. Environment Configuration

`.env.example` contains names and comments only, never values.

```bash
# ---- Public (browser-visible; never a secret) ----
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_ENV=                 # development | production — drives the environment badge

# ---- Core server ----
SUPABASE_SERVICE_ROLE_KEY=           # server only, never NEXT_PUBLIC_
APP_BASE_URL=                        # absolute, used to build deep links
APP_TIMEZONE=Asia/Jakarta            # business timezone; never derived from the server clock

# ---- Machine-to-machine auth (Phase 7) ----
INGEST_HMAC_SECRET=                  # signs /api/ingest/lead; held only by server-side source components
INGEST_HMAC_SECRET_PREVIOUS=         # optional, valid during a rotation window
CRON_SECRET=                         # bearer token for /api/jobs/*; also configured in the scheduler
JOBS_ENABLED=                        # true only in production; previews and local set false

# ---- Phase 8: HubSpot ----
HUBSPOT_ACCESS_TOKEN=                # private app, minimum scopes
HUBSPOT_WEBHOOK_SECRET=              # client secret used for request signature validation
HUBSPOT_PORTAL_ID=                   # used to build record deep links

# ---- Phase 9: Slack ----
SLACK_WEBHOOK_URL=                   # environment-specific channel

# ---- Phase 10: Meta ----
META_AD_ACCOUNT_ID=
META_ACCESS_TOKEN=                   # ads_read only
META_API_VERSION=                    # pinned; record the verification date in DECISIONS.md

# ---- Deferred ----
# GA4_PROPERTY_ID=
# GOOGLE_ADS_CUSTOMER_ID=
```

Every variable is declared in `lib/env.ts` or `lib/env.server.ts` with a Zod schema and a phase annotation; a variable belonging to an unbuilt phase is optional until that phase. `JOBS_ENABLED=false` makes `/api/jobs/*` return 200 `{skipped:true}` for scheduled callers while still allowing manual triggers.

---

## 39. Claude Code / Codex Development Protocol

### 39.1 Standing rules

1. **Read this document before changing architecture.** If a change contradicts it, stop and ask; do not implement and explain afterwards.
2. **One phase at a time.** Implement only the phase named in the instruction. Do not build a later phase's functionality because it "would be easy now".
3. **Do not invent requirements.** A gap is documented in `DECISIONS.md` and raised, not filled by guessing.
4. **Do not silently change architecture.** Any deviation is recorded in `DECISIONS.md` with its reason before the code lands.
5. **No new dependency, table, service, public endpoint or abstraction** without a `DECISIONS.md` entry.
6. **Prefer the simplest implementation that satisfies the requirement.**
7. **Strict TypeScript.** No `any` without an adjacent `// why:` comment.
8. **Domain logic never lives in a React component, a job handler, a database function or an external tool.** It lives in `domain/`.
9. **Integrations stay behind `integrations/`.** No `fetch` to an external API from anywhere else.
10. **Validate every external input with Zod** at the boundary.
11. **Never expose a secret client-side. Never log PII or tokens.**
12. **Schema changes only via migrations.** Never edit an applied migration.
13. **RLS on every new table, in the same migration.**
14. **Use the Phase 1 design system.** A feature that needs a new pattern adds it to the design system first.
15. **No fabricated data on any route.** Illustrative data lives only in the env-gated gallery.
16. **Tests accompany the feature.** Domain logic has unit tests before its UI exists; every job has a double-run test.
17. **Run `lint`, `typecheck`, `test`, `build`** before declaring anything complete.
18. **When a requirement is ambiguous: STOP and document the ambiguity.** A guess that ships becomes a fact nobody remembers deciding.
19. **STOP at the end of the phase.** Produce the completion report and wait. Do not begin the next phase without an explicit instruction.

### 39.2 Task prompt template

```
TASK: Implement Phase <n> only.

Read: PRD.md §35 Phase <n>, plus the sections it references; DATA_MODEL.md; AGENTS.md
Scope: exactly the phase's Scope section
Out of scope: exactly the phase's Out of Scope section
Acceptance criteria: the phase's checklist, verbatim
Verification: npm run lint && npm run typecheck && npm test && npm run build
Do not modify unrelated modules. Stop and report when the phase gate is evaluated.
```

### 39.3 Phase completion report (required at the end of every phase)

```
### PHASE <n> STATUS
PASS / FAIL

### Implemented
<requirement IDs completed, one line each; any requirement not completed, with reason>

### Files / Components
<important affected areas: migrations, domain modules, services, routes, components, jobs>

### Database Changes
<migration filenames; applied from empty: yes/no; RLS confirmed: yes/no>   — or "None"

### Tests & Quality Gates
<test IDs added and their actual results>
lint ✓/✗   typecheck ✓/✗   tests ✓/✗   build ✓/✗

### Acceptance Criteria
<each criterion: satisfied / failed, with evidence>

### Architectural Decisions
<DECISIONS.md entries added; deviations from PRD with rationale>   — or "None"

### Unresolved Issues
<remaining blockers, uncertainties, or external preconditions not yet met>   — or "None"

### Recommended Next Step
<what must happen before the next phase is instructed>
```

The phase-specific additions listed under each phase's heading 25 are appended after this standard block.

### 39.4 Phase gate

A phase is `PASS` only when **all** of the following hold:

- [ ] Every functional requirement in the phase is implemented
- [ ] Every acceptance-criteria checkbox is ticked with evidence
- [ ] Migrations apply cleanly from an empty database (or the phase has none)
- [ ] RLS is enabled with policies on every new table
- [ ] Tests listed in the phase pass, including double-run tests for any job
- [ ] `lint`, `typecheck`, `test`, `build` all pass
- [ ] Traceability matrix updated to `Verified` for the phase's requirements
- [ ] `DECISIONS.md` updated for any deviation; `TASKS.md` updated with what remains
- [ ] No open `CRITICAL` issue
- [ ] No fabricated data on any route; no secret in the client bundle

**The coding agent does not begin phase N+1 until explicitly instructed.** A `FAIL` is a normal outcome, reported plainly with what is missing, never worked around.

---

## 40. Future Roadmap

Ordered by expected value. Nothing here may complicate the MVP architecture.

| Item | Prerequisite | Why it is deferred |
|---|---|---|
| Google Ads connector | Phase 10 | Schema is platform-agnostic; this is an adapter plus one job. **Likely the first post-MVP connector given where intent-based spend sits.** |
| GA4 / GTM website metrics | Verified LP tracking contract | No daily decision depends on it until landing-page instrumentation is trustworthy |
| Ad-level granularity + creative dimensions | Phase 10 + naming compliance above threshold | Parsing unreliable names produces confident nonsense |
| Offline conversion upload | Phase 8 with reliable outcome completeness | Uploading incomplete outcomes trains the platform on a lie |
| Monthly reporting | Phase 12 | `reports.type` already allows it; assembly differs only in window |
| AI narrative drafting for reports | Phase 12 | The facts JSON is already the right input shape |
| AI copilot over the operational record | Phases 11–12 | Needs a trustworthy record first, which is the point of Phases 0–13 |
| **n8n as optional orchestration layer** | A concrete cross-system automation need (§21.5) | It would front the same endpoints; adopting it changes configuration, not code |
| WhatsApp conversation SLA metrics | WhatsApp API decision | Depends on an external platform choice |
| Multi-touch attribution | Sustained multi-channel volume | First/last touch is honest at current volume |
| Role-based views | A second user actually exists | `profiles.role` and `can()` already anticipate it |
| Approval workflow for campaign changes | A team, not a solo operator | — |
| Automatic playbook retrieval from alert type | A matured playbook | Manual linking already covers most of the value |
| LinkedIn / TikTok connectors | Active spend on those platforms | — |
| Budget pacing and forecast scenarios | A quarter of data | Forecasting on a quarter of noise is astrology |
| Autonomous optimisation | Everything above plus a track record of correct advisory verdicts | Permanently gated behind human approval |

---

## Appendix A — External Preconditions (not built by this application)

Dependencies on other systems and other people. Each blocks a specific phase; none is solved by code in this repository.

| # | Precondition | Blocks | Owner | Notes |
|---|---|---|---|---|
| A1 | HubSpot custom properties of §19.2 created with the exact internal names | 8 | CRM admin | Renaming later breaks the mapping loudly, by design |
| A2 | HubSpot private app token with minimum scopes; pipeline, stage and owner ids recorded | 8 | CRM admin | Recorded in `app_settings`, not code |
| A3 | Agreement on **who** completes Closed Won/Lost and within what SLA | 8, all revenue metrics | Sales / VP Marketing | The single most consequential dependency outside the builder's control; `R-09` suppresses revenue verdicts without it |
| A4 | Slack app plus two channels (prod, dev) with webhook URLs | 9 | Workspace admin | — |
| A5 | Meta system-user token with `ads_read`; account currency and timezone confirmed | 10 | Ads admin | Accept the mixed-currency refusal if not IDR |
| A6 | UTM convention published and enforced on every ad and link | 6 onward | Marketing | Attribution coverage depends on it; document it as a Playbook reference article |
| A7 | Campaign / ad naming convention (§23.5) adopted | 10 | Marketing | Compliance is measured, not assumed |
| A8 | Landing-page backend (Apps Script) emits the §23.2 payload and **signs it server-side** | 7 | LP developer | PM OS provides the signing recipe in `INTEGRATIONS.md`; the browser never holds the secret |
| A9 | WhatsApp API configuration decided (Cloud API vs BSP), determining whether `ctwa_clid` is obtainable and whether the gateway can sign requests | 7 (deterministic CTWA) | External / vendor | Degraded mode works regardless; a gateway that cannot sign uses the documented per-source token path |
| A10 | Vercel plan supports the job cadences in §21.1 (10-minute and 5-minute jobs) | 7 | Builder | If not, the documented fallback scheduler is configured in Phase 7 — same endpoints, no code change |
| A11 | Target CPQL agreed from average deal value, margin and MQL→won rate | 11 | VP Marketing | A kill rule with a guessed threshold kills the wrong campaigns |

---

## Appendix B — Open Questions (require a business decision, not a technical one)

1. **Target CPQL and target CPL.** Derived from average deal value, gross margin and MQL→won rate? Rules `R-02` and `R-05` are inert until this exists. *(Blocks Phase 11.)*
2. **First connector.** Meta is specified for Phase 10 because CTWA is live and the API path is known. If the majority of intent-based spend sits on Google Search, the Google Ads connector may deliver more value first. **Recommendation:** Meta first, Google Ads immediately after — unless Google spend exceeds Meta by more than 2×. *(Affects Phase 10 only; schema unaffected.)*
3. **SQL ownership.** Confirmed that SQL and downstream are decided in HubSpot by sales, with PM OS mirroring? If the marketing specialist sets SQL in practice, the ownership matrix and write-back flag change. *(Phase 8.)*
4. **Stale-lead SLA.** Defaults: 2 workdays MQL, 3 workdays SQL. Agreed with whoever handles WhatsApp conversations? *(Phase 9 alert volume.)*
5. **Lifecycle write-back.** Should PM OS set HubSpot lifecycle to MQL automatically, or only record its reason? Default **off**. *(Phase 8.)*
6. **Report format.** Markdown plus print view sufficient for the VP Marketing, or is a Google Doc/Slides deliverable expected? *(Phase 12.)*
7. **Second user horizon.** Access for Marketing Lead or Sales within six months? If yes, role enforcement moves into Phase 13. *(Phase 13 scope.)*
8. **Lead PII retention** after a lost deal — a definite period is better than "reviewed annually". *(§32.)*
9. **Scheduler plan.** Is the hosting plan's cron cadence sufficient for the 5- and 10-minute jobs, or should the fallback scheduler be configured from the start? *(Phase 7 — a cost question, not a design question.)*

---

## Appendix C — Glossary

| Term | Meaning in this document |
|---|---|
| **Lead** | One inquiry event. A person who inquires twice produces two leads and one contact. |
| **Contact** | A person. Mirrors a HubSpot Contact. |
| **MQL** | A lead satisfying the deterministic rules in §26.3. Decided by PM OS. |
| **SQL** | A lead accepted by sales. Decided in HubSpot, mirrored by PM OS. |
| **CPQL** | Spend ÷ MQL. The primary optimisation metric. |
| **CPL** | Spend ÷ leads. Diagnostic only. |
| **Cohort basis** | Outcomes counted against the date the lead was acquired. |
| **Activity basis** | Events counted against the date they occurred. |
| **Attribution coverage** | Share of leads with a resolvable campaign. Gate for optimisation verdicts. |
| **Outcome completeness** | Share of past-due deals marked won or lost. Gate for revenue verdicts. |
| **Verdict** | Decision-engine output: MONITOR, INVESTIGATE, HOLD, SCALE_CANDIDATE, PAUSE_CANDIDATE, SUPPRESSED. |
| **Job** | A server function registered in the job registry and invoked through `/api/jobs/[job]` by the scheduler or manually. |
| **Retry queue** | `webhook_events` rows with `next_retry_at`, re-processed by `JOB-RETRY-EVENTS`. |
| **Vertical slice** | One route activated end to end: migration → domain → repository → service → UI → tests. |
| **Unactivated state** | The honest empty/not-connected state a Phase 1 route shows until its slice is built. |
| **Phase gate** | The checklist that must pass before the next phase is instructed. |
| **WIB** | Waktu Indonesia Barat, UTC+7, `Asia/Jakarta`. The business timezone for every date in this system. |

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Sep 2026 | Initial PRD and technical blueprint |
| 2.0 | Sep 2026 | Implementation-ready rewrite: testable requirement IDs, corrected data model (AD-01 – AD-05), single ingestion path, concrete qualification and decision rules, timezone/currency semantics, per-phase gates, traceability |
| 3.0 | 11 Sep 2026 | **n8n removed from the runtime** (AD-15); relay, retry, scheduling and dispatch are application-owned: `webhook_events` retry queue (AD-16), `/api/jobs/[job]` with advisory locks and bounded batches, Vercel Cron as a replaceable trigger, direct HubSpot/Slack/Meta integration; n8n retained only as a Future/Optional Orchestration Layer (§21.5). **UI foundation moved to Phase 1** with a full route skeleton and honest unactivated states; authentication to Phase 2; delivery restructured as frontend-foundation-first then full-stack vertical slices (§13.4–13.5, §35.1). Fourteen phases with a 25-heading structure; 154 requirements, all task and test IDs renumbered; traceability matrix regenerated; MVP boundary redefined as Core (0–6) / Integration (7–10) / Post-MVP (11–13); dependency audit (§35.3); scheduler precondition (A10) and open question added; `webhook_events` and `integration_runs` extended; `alerts` gains notification status; reports gain database-level immutability. |

**END OF VERSION 3.0**
