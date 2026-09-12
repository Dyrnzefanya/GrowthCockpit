# Data Model

## Phase 0 state

There are no application tables. `supabase/migrations/0001_extensions.sql` enables `pgcrypto` and `citext` and creates the reusable `public.set_updated_at()` trigger function. Product schemas begin in their PRD-defined phases.

## Phase 2 state

`0002_identity.sql` creates only `profiles` and `app_settings`; both enable RLS in that migration. An auth-user insert provisions a matching profile through `handle_new_user()` with a fixed search path and no public execution grant. User-provided role metadata is ignored. Authenticated users can read only their own profile and update its name/timezone; role changes and profile creation/deletion are privileged operations.

Settings are workspace-wide: authenticated users can read rows and update only `value`. A trigger stamps `updated_by=auth.uid()` and the shared timestamp trigger stamps `updated_at`; clients cannot forge either field. Anon has no table grants or policies. Zod validates settings reads and application writes; unknown keys warn and are ignored, while malformed known values use documented defaults. Operational validation remains in the application, not a database business-rules function.

`0003_identity_defaults.sql` is a forward-only completion of the documented defaults, leaving the already-applied identity migration unchanged. Thirteen settings are seeded; future qualification, attribution, experiment, job, follow-up and metric behavior remains inactive. Generated TypeScript types reflect the applied local schema. Next phase migrations must continue after version 0003.

## Binding principles (unchanged by Phase 2)

- Contact means a person. Lead means an inquiry event. One contact can have multiple leads.
- HubSpot is authoritative for CRM contacts and lifecycle state. Supabase holds the PM OS operational record and analytics mirror.
- Database identifiers are UUIDs generated with `gen_random_uuid()` unless the PRD specifies an external identifier.
- Timestamps use `timestamptz`; business dates use Asia/Jakarta calendar semantics.
- Money is stored as integer minor units plus an ISO currency code. Conversion uses the PRD-defined rate and preserves source amount, source currency, converted amount, target currency, rate, and rate date. Missing conversion data stays unavailable.
- Attribution records first and last touch as defined by the PRD. Unknown attribution remains unknown; it is never inferred without evidence.
- Funnel facts derive from explicit lead events and lifecycle mappings. Unavailable events or metrics remain null/unavailable.
- Every future public table receives RLS and policies in the migration that creates it.
- Applied migrations are immutable. Corrections use a new forward migration.

## Ownership by phase

| Phase | Schema responsibility                                            |
| ----- | ---------------------------------------------------------------- |
| 0     | Extensions and shared timestamp trigger only                     |
| 2     | Profiles and authentication-linked access                        |
| 3–5   | Today, playbook, and experiment operational records              |
| 6     | Contacts, inquiry-event leads, attribution, and funnel facts     |
| 7     | Webhook events, sync state, integration runs, and job foundation |
| 8–10  | HubSpot, Slack/alerts, and Meta performance mirrors              |
| 11–12 | Decision outcomes and report records                             |
| 13    | Retention, audit, and production hardening changes               |

The exact tables, columns, constraints, indexes, RLS policies, and migration order remain those specified by `PRD.md`; this document does not override them.
