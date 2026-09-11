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

Phase 1 — Design System & Application Shell is next only after Phase 0 passes and a human explicitly instructs it.

## Known future decisions and issues

- **Phase 6:** inquiry identity, contactability, and deduplication; lead-only views before Phase 10 spend data.
- **Phase 7:** scheduler/fallback; scheduler-wide outage detection; A10/A12 reference; retry/dead-letter terminology; `pg_cron`/`pg_net` versus extension whitelist.
- **Phase 8:** manual qualification override versus HubSpot lifecycle authority.
- **Phase 9:** Slack INFO routing.
- **Phase 11:** R-01 versus R-02 sample-gate precedence.
- **Phase 13 / deployment planning:** production and real-data sequencing where still applicable.

These are not Phase 0 blockers and must not be resolved speculatively.
