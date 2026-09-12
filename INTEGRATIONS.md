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

## GitHub publication

GitHub target subsequently supplied by the operator: `https://github.com/Dyrnzefanya/GrowthCockpit`. This checkout's `origin` now points to that repository, with `main` preserving the existing local history. This resolves repository selection only; Supabase/Vercel setup and deployed verification remain pending as listed above.

## Deferred integration decisions

- Phase 7: scheduler/fallback behavior; scheduler-wide outage detection ownership; A10/A12 reference correction; canonical retry/dead-letter terminology; `pg_cron`/`pg_net` versus the extension whitelist.
- Phase 8: manual qualification override behavior relative to HubSpot lifecycle authority.
- Phase 9: Slack INFO routing.
- Phase 13/deployment planning: remaining real-data and production sequencing.

These items must be resolved before their owning phase is implemented. They do not expand Phase 0.
