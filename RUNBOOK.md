# GrowthCockpit Production Runbook

Use this runbook for the production workspace. Keep values in Vercel, Supabase, and provider secret stores; never paste them into issues, logs, or this repository.

## First response

1. Open `/integrations`, note the affected integration/job, last success, failure count, recent error code, and correlation ID.
2. Check `/today` for the matching alert and evidence. Do not change a live campaign automatically.
3. Confirm the `PROD` badge before changing production configuration.
4. Fix configuration or provider availability, run the narrow recovery action below, and verify a successful run before acknowledging the alert.

## Secret rotation

Rotate immediately after suspected disclosure. Redeploy after changing Vercel values and confirm `npm run secrets:client` against the production build artifacts.

| Secret                       | Rotation procedure                                                                                                                                                                                                                   | Verification                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_SECRET_KEY`        | Create/roll the production secret key in Supabase, replace the Vercel Production value, redeploy, then revoke the former key.                                                                                                        | `/api/health` reports database `ok`; authenticated reads and one authorized manual job work.                  |
| `INGEST_HMAC_SECRET`         | Generate a distinct 32+ character value. Put the old current value in `INGEST_HMAC_SECRET_PREVIOUS`, deploy, update Apps Script to sign with the new current value, verify one inquiry, then remove the previous value and redeploy. | New signature returns 202/200; an old signature fails after the overlap closes.                               |
| `CRON_SECRET`                | Generate a distinct 32+ character value. Update Vercel Production and the one active scheduler provider, redeploy, then remove the former scheduler value.                                                                           | An observed scheduled run succeeds; the former bearer returns 401.                                            |
| `HUBSPOT_ACCESS_TOKEN`       | Create a least-privilege private-app token for the production portal, replace the Vercel Production value, redeploy, run reconcile, then revoke the former token.                                                                    | HubSpot card and `JOB-HUBSPOT-RECONCILE` show a new success.                                                  |
| `HUBSPOT_WEBHOOK_SECRET`     | Rotate the app secret in HubSpot and Vercel as one maintenance change, redeploy, and update the production webhook subscription if HubSpot requires it.                                                                              | A real signed webhook is accepted and a tampered signature remains 401.                                       |
| `SLACK_WEBHOOK_URL`          | Revoke the old Incoming Webhook, create one for the production channel, replace the Vercel Production value, and redeploy.                                                                                                           | Run `JOB-NOTIFY-DISPATCH` with an eligible test alert and verify one redacted message plus recorded delivery. |
| `META_ACCESS_TOKEN`          | Issue a production System User token with `ads_read` only, replace the Vercel Production value, redeploy, and revoke the former token.                                                                                               | Run `JOB-META-INGEST`; account, currency, timezone, and token metadata match production.                      |
| Deployment-protection bypass | Rotate it in Vercel and the active external scheduler only.                                                                                                                                                                          | A protected scheduled request succeeds and a request with the former value cannot bypass protection.          |

The Supabase publishable key is browser-visible by design. If it is rolled, update the Vercel Production public value and rebuild; do not treat it as a privileged credential.

## Integration recovery

| Integration                | Recovery                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Landing page / Apps Script | Correct the signing secret or source payload, submit one new test inquiry, then run `JOB-RETRY-EVENTS`. Retry a dead letter only after its cause is fixed; rejected authentication events are never retried.                                                 |
| HubSpot                    | Confirm portal ID, token, webhook secret, mapping, and production webhook URL. Run `JOB-HUBSPOT-RECONCILE`. Use the HubSpot detail page for a bounded date or record re-sync when needed. Manual PM OS qualification overrides remain authoritative locally. |
| Meta Ads                   | Confirm account ID, `ads_read` token, API version, currency and account timezone. Run `JOB-META-INGEST`; use the existing bounded backfill controls for a missing date range. Cancel a pending range only when the stored failure is permanent and reviewed. |
| Slack                      | Confirm the webhook belongs to the production channel and run `JOB-NOTIFY-DISPATCH`. Delivery failure must not block the in-app alert or the owning transaction.                                                                                             |

## Jobs

Use the **Run now** action for the named job on `/integrations`. For automation, Vercel invokes `GET /api/jobs/<job>` with `Authorization: Bearer <CRON_SECRET>`; manual browser actions use the authenticated server action.

| Job                     | Production schedule | Purpose                                                               |
| ----------------------- | ------------------- | --------------------------------------------------------------------- |
| `JOB-NOTIFY-DISPATCH`   | every 5 minutes     | Send eligible alert notifications.                                    |
| `JOB-RETRY-EVENTS`      | every 10 minutes    | Resume authenticated inbound events.                                  |
| `JOB-HUBSPOT-RECONCILE` | every 30 minutes    | Reconcile CRM mirrors and write-back.                                 |
| `JOB-DATA-HEALTH`       | hourly              | Evaluate source and scheduler health.                                 |
| `JOB-META-INGEST`       | 06:00 WIB daily     | Ingest/restate Meta campaign facts.                                   |
| `JOB-EVALUATE-RULES`    | 07:00 WIB daily     | Persist deterministic decision evaluations.                           |
| `JOB-WEEKLY-REPORT`     | 07:30 WIB Monday    | Create the prior complete week's draft.                               |
| `JOB-STALE-LEADS`       | 08:00 WIB weekdays  | Evaluate follow-up SLAs.                                              |
| `JOB-RETENTION`         | 02:00 WIB daily     | Null payloads older than 90 days and prune runs older than 12 months. |

A 409 means another lease is active; wait for it to finish. A failed or partial run remains visible. Fix the named cause and repeat the same job; idempotency and leases prevent duplicate ownership changes.

## Critical alerts

| Alert type               | Response                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tracking_failure`       | Open the linked tracking QA Playbook, verify form delivery, UTM/campaign identity and CRM ingestion. Pause decision-making on affected evidence until tracking is restored; GrowthCockpit never pauses a campaign itself. |
| `integration_failure`    | Inspect the integration and recent runs, fix credentials/mapping/provider availability, run its narrow recovery action, and verify the backlog drains.                                                                    |
| `dead_letter`            | Inspect the redacted error and attempt history. Fix the cause, then use **Retry now** once. Leave unsafe/invalid payloads retained as terminal evidence.                                                                  |
| `job_failure_streak`     | Check configuration, provider status, rate limits and the last three run errors. Run manually after repair and confirm failure count resets.                                                                              |
| `scheduler_overdue`      | Follow the scheduler-outage procedure below, then run the missed job manually. Confirm its last run and last success advance.                                                                                             |
| `slack_delivery_failure` | Restore/rotate the production webhook and run `JOB-NOTIFY-DISPATCH`. Continue operating from in-app alerts while Slack is unavailable.                                                                                    |

## Scheduler outage

1. Check Vercel Cron settings and deployment logs. Confirm the production deployment still has `JOBS_ENABLED=true`, `APP_ENV=production`, and the current `CRON_SECRET`.
2. Verify the Vercel plan still supports every cadence in `vercel.json`. Vercel schedules are UTC.
3. Confirm GitHub fallback variable `PMOS_SCHEDULER` is **not** `github` while Vercel Cron is active.
4. Run missed jobs manually in dependency order: retry events, HubSpot, Meta, data health, decisions, notifications, reports/stale leads if due, then retention.
5. If Vercel Cron cannot meet the cadence, set `PMOS_SCHEDULER=github` and configure its protected secrets only after disabling/removing the equivalent Vercel schedules. Never run both providers.
6. Observe at least one scheduled success for every job before closing the incident.

## Backup restore

1. Select the production Supabase backup immediately before the recovery point and record its timestamp.
2. Restore into a new, empty scratch Supabase project in the same PostgreSQL major version. Never restore over production for a drill.
3. Point an isolated Preview deployment at the scratch project with separate server secrets and `JOBS_ENABLED=false`.
4. Run `supabase migration list`, `supabase db lint`, the all-table RLS audit, and read-only counts for contacts, leads, deals, reports, webhook events and integration runs.
5. Verify identity sequences/unique allocators by creating and deleting a scratch experiment and draft report. Verify one invited scratch identity can read while anon cannot read leads.
6. Record backup time, restore start/end, duration, row-count comparison, migration head, sequence check, RLS result and outcome below. Destroy the scratch project after evidence is approved.

### Restore drill record

| Field                                          | Evidence                                                                                                                                                                                                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local engineering rehearsal                    | **PASS, 2026-09-16.** A separately named local Supabase project applied migrations 0001–0032 from zero in 64 seconds. A data-only logical backup from the main isolated stack restored into that scratch project in 0.3 seconds.                                                   |
| Rehearsal validation                           | Exact source/target counts matched: settings 28, Playbook 5, reports 1, integration runs 41, and zero contacts/leads/deals/webhooks. All public tables retained RLS and at least one policy; the retention/grant audit passed. The scratch project was destroyed after validation. |
| Managed production backup                      | **PENDING — production Supabase project and approved scratch project are not available in this checkout.**                                                                                                                                                                         |
| Date / duration / operator                     | PENDING                                                                                                                                                                                                                                                                            |
| Source backup / scratch project                | PENDING; record project references without credentials.                                                                                                                                                                                                                            |
| Migration, row-count, sequence and RLS results | PENDING                                                                                                                                                                                                                                                                            |
| Outcome                                        | PENDING; do not call backups verified until this drill passes.                                                                                                                                                                                                                     |

## Repeatable production deployment and cutover

1. Create a dedicated production Supabase project; do not reuse the linked development project. Enable managed backups and invite-only Auth.
2. Apply all migrations from zero in order through the Supabase CLI. Compare generated types, run database lint, the full SQL suite, and the RLS catalog audit.
3. Configure Supabase Site URL/callback allowlist and the versioned invite/magic-link templates for the production HTTPS domain.
4. Configure Vercel **Production** values from `.env.example`; use production-only Supabase, HubSpot, Slack and Meta credentials. Set `APP_ENV=production`, `APP_TIMEZONE=Asia/Jakarta`, the canonical `APP_BASE_URL`, `JOBS_ENABLED=true`, and distinct machine secrets.
5. Confirm Deployment Protection is enabled and provider callback/scheduler traffic has the intended protected access. Apply the production domain and verify HTTPS/HSTS.
6. Deploy the exact reviewed commit. Confirm the `PROD` badge, `/api/health`, login, Today, one daily checklist, lead create/qualification, experiment lifecycle, report draft/finalisation and all `/integrations` cards.
7. Configure the production landing ingest secret/callback, HubSpot webhook URL, Slack channel webhook and Meta token/account. Run each recovery check above.
8. Confirm the Vercel plan supports every checked-in cadence, enable Vercel Cron, keep GitHub fallbacks disabled, and record each job's first observed scheduled success.
9. Execute the restore drill. Review logs for email/phone patterns and run the repository-history and client-bundle secret scans.
10. Move the operator's daily work to production only after every row below is PASS. Roll back the application to the prior deployment for application defects; for data defects, stop scheduled jobs and follow the restore procedure rather than editing migration history.

### Cutover record — 2026-09-16

| Check                                                            | Status                                |
| ---------------------------------------------------------------- | ------------------------------------- |
| Dedicated production Supabase project and zero-to-head migration | PENDING                               |
| Separate production environment values and `PROD` badge          | PENDING                               |
| Deployment Protection, custom domain, HTTPS and HSTS             | PENDING (HSTS is implemented locally) |
| Production landing ingest, HubSpot, Slack and Meta configuration | PENDING                               |
| Production authentication and protected-route verification       | PENDING                               |
| Critical production smoke flow and operational UAT               | PENDING                               |
| Every production schedule first observed run                     | PENDING                               |
| Managed backup restore drill                                     | PENDING                               |
| Operator begins daily production use                             | PENDING                               |
