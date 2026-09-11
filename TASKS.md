# Tasks

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

Phase 1 is complete with PASS. Phase 2 has not begun and requires a separate explicit instruction and its own precondition review.

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

## Known future decisions and issues

- **Phase 6:** inquiry identity, contactability, and deduplication; lead-only views before Phase 10 spend data.
- **Phase 7:** scheduler/fallback; scheduler-wide outage detection; A10/A12 reference; retry/dead-letter terminology; `pg_cron`/`pg_net` versus extension whitelist.
- **Phase 8:** manual qualification override versus HubSpot lifecycle authority.
- **Phase 9:** Slack INFO routing.
- **Phase 11:** R-01 versus R-02 sample-gate precedence.
- **Phase 13 / deployment planning:** production and real-data sequencing where still applicable.

These are not Phase 0 blockers and must not be resolved speculatively.
