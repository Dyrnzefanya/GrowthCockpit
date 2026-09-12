# Architectural Decisions

## D-006 — Phase 2 authentication and settings foundation

**Status:** Accepted implementation choice within PRD §17. Use invite-only email magic links, mandatory email verification, and `@supabase/ssr` 0.12.7 with `@supabase/supabase-js` 2.116.0. Auth runs on the server with HttpOnly, Secure, SameSite=Lax cookies; the anonymous browser client does not manage the session. `src/proxy.ts` is the installed Next.js 16 replacement for middleware. Protected data reads and server actions independently validate the session. `/auth/confirm` is the sole new public callback, authenticated by a single-use Supabase email token; redirect destinations are restricted to internal application paths.

Local public signup is disabled through versioned Supabase configuration. Remote dashboard signup, email templates, redirect allowlists, SMTP, and host deployment protection require verification on the supplied development projects; local evidence is not remote evidence.

CLI 2.117 maps `auth.email.enable_signup` to email-provider enablement; it stays true so invited users can sign in. The global `auth.enable_signup=false` maps to `GOTRUE_DISABLE_SIGNUP=true` and blocks registration; the browser test verifies this directly.

`app_settings` is operational workspace configuration: authenticated read/write RLS matches the PRD's single-operator operational baseline. Database triggers set audit metadata; profile role and settings identity/description are not browser-writable. Provisioning ignores user-supplied role metadata and assigns the PRD default owner role. `can(action)` centralizes authorization; future role-specific behavior is deferred.

Phase 2 exposes profile name and the fixed Asia/Jakarta workspace timezone (`workspace.timezone`). Explicit PRD defaults for future qualification, HubSpot lifecycle writeback, attribution, and health settings are seeded and validated but have no feature behavior or editing UI until their owning phases. Unknown settings are ignored with a warning; malformed known values use the documented default. Warnings are shown in Settings; no Phase 9 alert subsystem is introduced.

Metrics, experiment duration, job limits and follow-up SLAs are also seeded from the PRD. The PRD supplies the SLA values but no key names; use `follow_up.mql_workdays` and `follow_up.sql_workdays` (2 and 3). A forward-only `0003_identity_defaults` completes defaults after `0002_identity` was applied; future phase migrations must use the next unused sequence rather than overwrite either migration. No future feature behavior is activated.

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
