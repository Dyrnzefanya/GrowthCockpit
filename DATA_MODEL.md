# Data Model

## Phase 0 state

There are no application tables. `supabase/migrations/0001_extensions.sql` enables `pgcrypto` and `citext` and creates the reusable `public.set_updated_at()` trigger function. Product schemas begin in their PRD-defined phases.

## Binding principles

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
