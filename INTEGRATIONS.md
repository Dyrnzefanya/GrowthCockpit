# Integrations

## Ownership and boundaries

No external integration is implemented in Phase 0. Future integration code belongs in `src/integrations/`, is invoked by services, validates inbound data at the boundary, and cannot own PM OS business rules.

| System             | Authoritative role                                                    | Earliest implementation phase      |
| ------------------ | --------------------------------------------------------------------- | ---------------------------------- |
| Supabase           | PM OS operational database, authentication, storage, analytics mirror | Foundation in 0; product use later |
| HubSpot            | CRM source of truth for contacts and lifecycle                        | 8                                  |
| Slack              | Alert delivery channel                                                | 9                                  |
| Meta Marketing API | Read-only performance source                                          | 10                                 |
| Vercel scheduler   | Production job trigger                                                | 7                                  |
| n8n                | Optional future orchestration over existing endpoints                 | Post-MVP decision                  |

Machine callers will use the PRD-defined HMAC or job secret, distinct from user authentication. Secrets stay in server-only environment variables. Production and non-production external endpoints and alert channels remain separate.

## Phase 2 authentication deployment checklist

Local Supabase Auth is active; HubSpot, Slack, Meta, jobs and n8n remain unimplemented. Local Mailpit captures test messages; no production operator/contact data is seeded.

Before the Phase 2 deployed gate can pass:

1. Supply the intended Supabase development project and a Vercel project with host deployment protection enabled. Keep production credentials/data separate.
2. In Supabase Auth settings, disable **Allow new users to sign up**, keep the email provider enabled, require email confirmation, and disable anonymous sign-ins. Record dashboard evidence; the local CLI setting alone is insufficient.
3. Set the project Site URL and narrow redirect allowlist to the protected deployment's HTTPS origin and `/auth/confirm` callback. Copy the versioned invitation and magic-link templates. Configure email delivery for the invited operator; do not commit SMTP credentials.
4. Apply migrations 0001–0003 to that development project, regenerate/compare types, and verify table policies. Configure only the two approved public Supabase variables and the required server variables, including canonical `APP_BASE_URL` and server-only `APP_ENV`.
5. Invite the operator through trusted Supabase administration. In a fresh browser, verify invitation/sign-in, `/today`, a protected `next` round-trip, settings audit metadata, sign-out, rejection of public signup, and HttpOnly/Secure/Lax cookies. Review logs for secret/PII exposure and callback URL logging at the host.
6. Record deployed URL and evidence in `TASKS.md`; do not publish tokens or credentials. Local browser fixtures intentionally refuse remote execution; use a designated invited test identity for this external gate.

These external checks are pending. No protected remote deployment or Supabase console configuration has been claimed.

Deployment-only verification on 2026-09-12 confirmed that this checkout still has no GitHub remote, linked Supabase development project, or linked Vercel project; Supabase CLI is unauthenticated and no browser session is connected. GitHub CLI authentication is available, but the target repository is not identified. Both configured application/Supabase origins are localhost. The evidence and all remaining remote gates are recorded in the Phase 2 deployment verification attempt in `TASKS.md`. Project identifiers/URLs and normal account sign-ins are required to continue; do not place credentials in project documents or chat.

## Phase 2 modern-key environment setup

The operator selected Supabase development project `oonxnzogzzciszojract`, URL `https://oonxnzogzzciszojract.supabase.co`, and reported an imported Vercel project whose first build fails environment validation. This is operator-reported context, not a verified remote deployment. D-007 aligns the installed SDK and application with publishable/secret API keys. No remote key value is recorded here.

In the existing Vercel project's **Settings > Environment Variables**, configure the following for each target being deployed. Select **Production** for the main-branch Production deployment and **Preview** for preview deployments, with target-specific values. Add **Development** only if using Vercel's local development environment; use an isolated local Supabase stack for automated tests.

| Variable                               | Visibility  | Value source / scope                                                                                                                                                                                       |
| -------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | PUBLIC      | Supabase project URL above; use the development project for this Phase 2 deployment.                                                                                                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | PUBLIC      | That project's Settings > API Keys > Publishable key.                                                                                                                                                      |
| `SUPABASE_SECRET_KEY`                  | SERVER-ONLY | That project's Settings > API Keys > Secret key; enter manually as a sensitive variable in Vercel. Rotate the privileged key disclosed in chat before using it.                                            |
| `APP_ENV`                              | SERVER-ONLY | `production` for Vercel Production, `preview` for Preview, `development` for local Development. Do not set a deployed target to development merely because its Supabase project is a development database. |
| `APP_BASE_URL`                         | SERVER-ONLY | The canonical HTTPS application origin for that Vercel target, from its Domains/deployment page; localhost origin for local development.                                                                   |
| `APP_TIMEZONE`                         | SERVER-ONLY | `Asia/Jakarta` for every target.                                                                                                                                                                           |

Remove legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` entries after switching the application revision. Do not create `NEXT_PUBLIC_APP_ENV` or any public secret variable. Future integration variables remain absent. Public values are inlined at build time, so save the environment configuration and redeploy the updated revision. Enable the required host deployment protection before testing. Deployed build/auth verification waits for operator confirmation and the actual Vercel URL.

After that confirmation, verify the remote Supabase project identity, link it, inspect migration history and apply only pending existing migrations 0001–0003 without a remote reset. Verify remote RLS/provisioning and Auth settings. Configure Supabase Auth > URL Configuration with the deployed Site URL and the specific localhost/deployed `/auth/confirm` callback URLs (including their permitted query parameters); preserve disabled self-signup, enabled email and email confirmation. The versioned invitation/magic-link templates remain unchanged. Do not substitute new/remote API secrets for CLI management authentication or database connection credentials.

## GitHub publication status

GitHub target subsequently supplied by the operator: `https://github.com/Dyrnzefanya/GrowthCockpit`. This checkout's `origin` now points to that repository, with `main` preserving the existing local history. This resolves repository selection only; Supabase/Vercel setup and deployed verification remain pending as listed above.

## Current Phase 2 remote evidence — 2026-09-12

The historical connection blockers above are superseded: GitHub is connected, Supabase CLI is authenticated and linked to `oonxnzogzzciszojract`, and the operator reports successful production login at `https://growthcockpitdyrn.vercel.app`. Remote Auth URLs, signup restriction and token-hash email templates are verified after operator-managed SMTP configuration. Existing Phase 0–2 migrations plus the documented missing-profile repair `0004_identity_backfill` are applied remotely; RLS/provisioning/audit SQL tests pass with rollback. No remote database reset was used.

Remaining deployment gates are explicitly listed in the latest `TASKS.md` closure attempt: authenticated session/logout/two-tab/settings verification, complete deployed browser-secret evidence and Vercel host-protection verification. No authenticated operator browser is connected to the agent. Local browser fixtures still refuse remote execution; no production identity or secret was copied into local test infrastructure. Phase 2 is not closed.

## Deferred integration decisions

- Phase 7: scheduler/fallback behavior; scheduler-wide outage detection ownership; A10/A12 reference correction; canonical retry/dead-letter terminology; `pg_cron`/`pg_net` versus the extension whitelist.
- Phase 8: manual qualification override behavior relative to HubSpot lifecycle authority.
- Phase 9: Slack INFO routing.
- Phase 13/deployment planning: remaining real-data and production sequencing.

These items must be resolved before their owning phase is implemented. They do not expand Phase 0.
