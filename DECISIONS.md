# Architectural Decisions

## D-005 — Phase 1 interface foundation

**Status:** Accepted. Light mode only for MVP, as PRD §13.4 specifies. Use a compact neutral workspace with a deep green navigation rail, restrained green action accent, and four semantic status palettes. All values are centralized in `src/styles/tokens.css`. System fonts avoid a network dependency. Static route content remains server-rendered; only navigation state, filters, tables, and overlays require client interaction.

Use the required shadcn/ui Radix primitives for accessible overlays and controls, with their generated source adapted to the token system. Add `class-variance-authority` 0.7.1 for primitive variants, `radix-ui` 1.6.7 for accessible controls, `sonner` 2.0.8 for the required toast, and `@axe-core/playwright` 4.13.0 for TEST-1.2. No application service, table, integration, or business rule is added. The gallery is allowed only when server-side `APP_ENV=development`; preview and production return 404. This is a presentation sandbox, not a deployment.

## D-001 — Public environment contract

**Status:** Accepted

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
