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

## Deferred integration decisions

- Phase 7: scheduler/fallback behavior; scheduler-wide outage detection ownership; A10/A12 reference correction; canonical retry/dead-letter terminology; `pg_cron`/`pg_net` versus the extension whitelist.
- Phase 8: manual qualification override behavior relative to HubSpot lifecycle authority.
- Phase 9: Slack INFO routing.
- Phase 13/deployment planning: remaining real-data and production sequencing.

These items must be resolved before their owning phase is implemented. They do not expand Phase 0.
