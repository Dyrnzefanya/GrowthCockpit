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

Phase 0 and Phase 1 remain PASS. Phase 2 is now explicitly requested and implemented locally; its protected deployment gate remains pending. Phase 3 is not authorized and must not begin.

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

- **Phase 6:** inquiry identity, contactability, and deduplication; lead-only views before Phase 10 spend data.
- **Phase 7:** scheduler/fallback; scheduler-wide outage detection; A10/A12 reference; retry/dead-letter terminology; `pg_cron`/`pg_net` versus extension whitelist.
- **Phase 8:** manual qualification override versus HubSpot lifecycle authority.
- **Phase 9:** Slack INFO routing.
- **Phase 11:** R-01 versus R-02 sample-gate precedence.
- **Phase 13 / deployment planning:** production and real-data sequencing where still applicable.

These are not Phase 0 blockers and must not be resolved speculatively.
