# Integrations

## Phase 12 weekly report schedule and delivery

`JOB-WEEKLY-REPORT` uses the existing authenticated `/api/jobs/JOB-WEEKLY-REPORT` boundary, Phase 7 lease and integration-run history. The registry and opt-in `weekly-report.yml` declare Monday 07:30 WIB (`30 0 * * 1` UTC). Activate it only with deployment protection and the existing scheduler origin, bearer and bypass configuration. Local verification does not activate a schedule or claim delivery timing.

The job generates an idempotent draft for the previous completed ISO week. Finalisation remains an operator action and raises the existing alert pipeline's `report_ready` event. When Slack is configured, the Phase 9 dispatcher sends an authenticated internal report link plus bounded headline strings; it never sends facts JSON, narrative text, private lead data or credentials. Delivery failure is tracked and retried separately from the frozen report. Markdown download and printing remain authenticated in-app actions; no external document or file-delivery integration is introduced.

**External activation/UAT pending:** two consecutive real reports with less than fifteen minutes of editing, protected scheduler timing, real Slack delivery, and confirmation that Markdown plus print serves the leadership audience.

## Phase 11 evaluation schedule

`JOB-EVALUATE-RULES` reuses the authenticated manual/bearer scheduler endpoint at `/api/jobs/JOB-EVALUATE-RULES`. The registry and opt-in `decision-rules.yml` declare 07:00 WIB (`0 0 * * *` UTC). Deploy with host protection enabled before activating the existing GitHub fallback through `PMOS_SCHEDULER=github` and `PMOS_DECISIONS_ENABLED=true`; no schedule has been activated by local verification. The fallback resumes bounded batches and fails visibly if the daily evaluation exceeds thirty seconds. Job/measurement failures remain visible through Integrations and Today.

No new provider connection is needed. R-06 uses the existing Slack delivery policy for a critical tracking suspicion; other decision recommendations stay in app. Target CPQL and currency are configured later in Settings after business approval. Missing benchmark suppresses only R-02/R-05; missing frequency threshold or explicit lead-generation campaign ID suppresses the corresponding rule. This phase never changes a campaign or calculates/applies a budget.

## Phase 10 Meta Ads — current contract

Meta is a read-only performance source. Graph **v26.0** is pinned in `src/config/integrations.ts`, with verification date **2026-09-15**, based on [Meta's official SDK version](https://github.com/facebook/facebook-nodejs-business-sdk/blob/main/src/api.js), [account fields](https://github.com/facebook/facebook-nodejs-business-sdk/blob/main/src/objects/ad-account.js), and [insight fields](https://github.com/facebook/facebook-nodejs-business-sdk/blob/main/src/objects/ads-insights.js). Meta documentation endpoints returned HTTP 429 during inspection; this is source verification, not a live-account smoke test. Version changes require a deliberate decision.

- Server environment: `META_AD_ACCOUNT_ID` is the numeric provider account ID without `act_`; `META_ACCESS_TOKEN` is a System User token with `ads_read`; optional `META_API_VERSION` must equal `v26.0`. None is public. Missing configuration displays an honest disconnected state. Never enter tokens in application forms or control documents.
- The adapter verifies account identity, currency, timezone, token validity/scopes and expiry. Expiry/verification timestamps are stored in `app_settings.meta.token_metadata`; a WARNING is raised within 14 days of expiry. A provider-reported non-expiring token remains explicitly distinct from an unverified token.
- `JOB-META-INGEST` requests one source-calendar date at a time at campaign level, yesterday plus its three preceding dates. It requests raw spend/impressions/clicks/reach/frequency and action results/cost. Configure the exact primary `action_type` through Integrations; no action is guessed and missing results remain null. Recent dates may be restated.
- Authentication stays in headers except the API-required `debug_token` inspection parameter, confined to server memory and fixed-origin HTTPS. Next request/fetch logging is disabled; upstream bodies, URLs and tokens are never logged. Pagination reconstructs the fixed endpoint from an opaque cursor and never follows a provider `next` URL. Redirects are rejected. Timeout, transient errors and rate limiting have bounded retries; permanent failures require correction and preserve the failed position.
- One page and its next position commit atomically under the Phase 7 lease. Restarting resumes the same account/date/page. Completion clears the cursor; failed or partial runs retain existing good rows. A new manual range cannot overwrite a pending range. Continue it first, or explicitly cancel a permanently invalid pending range through the authorized recovery action; cancellation retains stored facts and run history. Changing primary action type requires re-ingest of the affected dates.
- `.github/workflows/meta-ingest.yml` is inactive until `PMOS_SCHEDULER=github` and `PMOS_META_ENABLED=true`. Reuse `PMOS_ORIGIN`, `PMOS_CRON_SECRET`, and scoped `PMOS_PROTECTION_BYPASS`. It runs at 23:00 UTC / 06:00 WIB and continues bounded invocations for at most 50 minutes. No paid Vercel plan or second scheduler is assumed; GitHub scheduling does not guarantee a 07:00 delivery SLA.

Performance reports cohort inquiry counts, not provider conversions. Join explicit campaign IDs first and exact unique last-touch ID/name second, only for `platform=meta`. Unknown WhatsApp/source attribution is excluded from campaign CPQL and disclosed as unjoined inquiries. Unjoined spend is shown separately. Ratios are calculated once in `domain/metrics/formulas`; missing/zero denominators return null. Raw daily reach and frequency are never summed into a fabricated aggregate. Mixed-currency totals are refused with a health alert and won revenue is displayed by currency. Non-WIB source dates and their timezone/offset are displayed; cost-to-WIB-cohort ratios are unavailable rather than silently shifting daily facts. Oldest contributing timestamps and insufficient sample are disclosed. There are no SCALE/PAUSE recommendations in this phase.

**External activation/UAT pending:** no local Meta token/account credentials were present, so actual system-user permission, account currency/timezone, adopted naming compliance, deployed 06:00→07:00 cadence, and one week of useful performance operation are not verified. Do not treat local mocked tests as this evidence. Preserve host deployment-protection and prior phase backlog requirements before activation.

## Phase 9 Slack outbound delivery

Slack is outbound-only through an Incoming Webhook held in server-only `SLACK_WEBHOOK_URL`. The environment schema accepts only HTTPS URLs under `hooks.slack.com/services/`; the value is absent from public configuration and browser artifacts. `SLACK_WEBHOOK_URL` is optional so in-app alerts continue honestly when Slack is not configured. The serializer sends only alert type/severity, non-PII entity identifiers, counts, allowlisted reason codes, deployment environment and an internal `/today#alerts` link. It never sends raw provider payloads, contact data, alert evidence wholesale or credentials.

Routing follows PRD §20.2 and D-016. Critical alerts, stale-lead digests, warning integration failures and the specified MQL/SQL/deal/recovery information events are Slack-eligible; experiment/rule information remains in-app. A key is delivered at most once per WIB business date. More than five eligible alerts of one type within an hour become one digest, and information events outside 07:00–20:00 WIB defer to the next morning. Transport uses native `fetch`, a short timeout and bounded retry. Application delivery state and backoff are persisted separately, so provider failure never removes the alert or blocks its producing transaction; terminal failure creates a non-recursive in-app critical alert.

The existing job endpoint runs `JOB-NOTIFY-DISPATCH` every five minutes, `JOB-DATA-HEALTH` hourly and `JOB-STALE-LEADS` at 08:00 WIB on weekdays when an approved scheduler is active. `.github/workflows/alert-jobs.yml` is opt-in with `PMOS_SCHEDULER=github`; it reuses the Phase 7 bearer boundary and optional host-protection bypass. Do not enable it alongside another scheduler. External Slack app/channel/webhook setup and deployed cadence are operational prerequisites and are not satisfied by local fixtures.

## Phase 8 mapping and runtime

The following mapping is implemented and locally verified. It is not evidence of an active remote CRM connection:

| HubSpot source                                                      | PM OS destination                                                                    | Ownership / conflict behavior                                                                                                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Company ID                                                          | `companies.hubspot_company_id`                                                       | Stable provider identity; mirror company data, never cascade-delete merged/archived records.                                                                                                   |
| Contact ID                                                          | `contacts.hubspot_contact_id`                                                        | Stable provider identity first; normalized email/phone reconcile existing local identities only when unambiguous. Never auto-merge.                                                            |
| Contact identity / lifecycle / owner                                | Contact identity fields, `lifecycle_stage`, `lifecycle_stage_at`, `hubspot_owner_id` | HubSpot owns CRM state. Actual stage/owner IDs must come from validated `hubspot.mapping`, not the PRD's illustrative example. Propagation into overridden inquiry status is blocked by D-014. |
| Deal ID / pipeline / stage / amount / currency / owner / timestamps | `deals.hubspot_deal_id` and existing deal mirror columns                             | HubSpot owns these fields; PM OS never writes them back. Retain source timestamps; record real stage transitions with `source='hubspot'`.                                                      |
| Deal `pmos_lead_id`, then associated contact                        | `deals.lead_id`, local inquiry/deal linkage                                          | Explicit inquiry reference first; contact fallback must not guess among multiple candidate inquiries. Unlinkable deals remain stored and flagged.                                              |
| PM OS contact first touch                                           | §19.2 `original_*` contact properties                                                | Write only when the corresponding HubSpot property is empty. Partial provider records must not erase PM OS attribution.                                                                        |
| PM OS MQL evidence                                                  | `lead_quality_reason`, `pmos_qualified_at`, `pmos_lead_id`                           | Narrow write-back per FR-8.6/§19.2–19.3. Lifecycle write-back stays false by default. No deal-stage/owner/amount write-back.                                                                   |
| Won deal + linked inquiry attribution                               | Existing attributed campaign, allocations and rule version                           | Use §23.3 and existing Phase 6 allocation helpers; preserve stamped historical attribution.                                                                                                    |

Implemented: fixed-origin server-only fetch client; explicit Zod mapping; domain mirror planner; Phase 7 claims, queue and run leases; bounded reconcile; signed webhook; allowlisted write-back; integration detail, mapping editor and lead divergence UI. No new table or dependency. D-014 is resolved: manually overridden inquiry qualification remains unchanged while contact CRM lifecycle is mirrored independently.

### Runtime and recovery contract

- `HUBSPOT_ACCESS_TOKEN`, `HUBSPOT_WEBHOOK_SECRET` and numeric `HUBSPOT_PORTAL_ID` are server-only. `APP_BASE_URL` supplies the trusted canonical signature URL. Absent credentials are Not Configured. No real HubSpot values are seeded.
- Before provider writes/sync, validate account portal ID and required property metadata. Missing/renamed properties disable sync. Preserve deal currency; the account currency is used only when metadata proves this portal has no per-deal currency property. There is no invented FX conversion.
- The only outbound API module is `src/integrations/hubspot/client.ts`. Fixed HTTPS host, redirect rejection, four-second fetch timeout, shared operation deadline, bounded five-attempt retry and per-instance throttle. Respect Retry-After; defer to the durable queue if the delay exceeds the operation budget. 401/403, invalid payloads, missing records and conflicts are terminal, with sanitized codes only.
- `/api/ingest/hubspot` authenticates raw UTF-8 bytes using documented v3 HMAC and five-minute timestamp bounds, or explicitly declared legacy v1 private-app SHA256. Invalid v3 never downgrades. V1 has no provider-signed timestamp; stable portal/subscription/event/object/property/time identity supplies durable replay protection. Delivery attempt numbers do not change identity. Body limit is 256 KiB; at most 100 notifications per receipt.
- Each valid notification enters the existing webhook queue before acknowledgement. Fetch complete current records, property history and associations; do not apply partial notification values directly. Transactions fence source versions and local revisions, preserve attribution, append source=hubspot events and finalize the claim atomically. Late workers cannot commit. Merge events park for manual resolution; archive notifications flag retained rows without cascade deletion.
- Contact/company/deal reads resolve by stable provider ID. Existing local contacts may link by unambiguous normalized email/phone. Multiple contacts, truncated associations or ambiguous inquiry fallback refuse guessing. The originating `pmos_lead_id` wins; an existing deal link is preserved. Unlinked deals remain visible and flagged. Manual re-sync can re-evaluate the same revision after a mapping correction; older revisions still cannot overwrite newer ones.
- Inquiry ingest/qualification queues contact/company write-back. First-touch properties are fill-empty only. MQL evidence writes the approved three properties; `hubspot.write_lifecycle_stage` defaults false and gates lifecycle only. No deal amount, owner or stage writes. A single Phase 7 run lease serializes outbound creation; uncertain create responses are parked as CONFLICT rather than blindly retried. Resolve the actual provider record before retrying uncertain creation. CSV and interrupted enqueue work are recovered from durable lead revisions during reconcile.
- Reconcile persists a fixed modified-time window, provider page cursor and remaining record IDs, with five-minute overlap. Batch reads are at most 100; invocation budgets and configured batch limits still apply. Failed positions remain resumable. No success is fabricated for an incomplete batch. Warnings and three-failure CRITICAL candidates are exposed from sync/run metadata; delivery belongs to Phase 9.
- `JOB-HUBSPOT-RECONCILE` targets 30 minutes. The opt-in `.github/workflows/hubspot-reconcile.yml` calls the existing authenticated job endpoint when `PMOS_SCHEDULER=github` and `PMOS_HUBSPOT_ENABLED=true`; it uses the Phase 7 origin, cron-secret and host-protection-bypass settings. Keep the retry-events scheduler enabled for queue processing. GitHub cron is best-effort, not an SLA guarantee. No scheduler is enabled here, no paid Vercel plan assumed, and no n8n introduced. Never enable two providers for the same schedule.

### External activation evidence still required

A1-A3 and INT-8.1-8.3 remain unverified. A name-only environment inspection found the three HubSpot variables absent; no HubSpot connector was exposed. No remote CRM API call, property change, subscription, migration or deployment occurred. Confirm the intended sandbox/portal, exact PRD section 19.2 properties, stage/owner IDs and minimum granted scopes before activation. Expected capabilities are contacts read/write, companies read/write, deals read and contact/deal property-schema read; no deal-write or CRM-merge capability is needed. Verify the actual private-app scope grant and account-details access against the chosen portal, rather than claiming them granted.

Register contact property/creation/deletion and deal property/creation/deletion subscriptions for the fields consumed by the adapter; contact merges are flagged. Configure the signing secret associated with that app and the exact protected HTTPS webhook URL. Obtain sanitized real sandbox response fixtures and verify portal mappings in `/settings`; committed automated fixtures are synthetic, not claimed real captures. Confirm sales ownership and Closed Won/Lost SLA. Lifecycle write-back remains disabled unless explicitly enabled by the operator. Then verify lead write-back, a real stage/deal transition, deployed queue cadence, and one full working week of CRM consistency. Preserve the earlier Phase 2 host-protection and authenticated-browser verification gaps.

Official references: [request validation](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/request-validation), [private-app subscriptions](https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/create-and-edit-webhook-subscriptions-in-private-apps), [search limits](https://developers.hubspot.com/docs/api-reference/latest/crm/search-the-crm), [batch read and property history](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/objects/batch/get-objects), [account identity/currency](https://developers.hubspot.com/docs/api-reference/legacy/account/account-information/get-account-details).

## Phase 7 — Apps Script signing and retry foundation

The operator selected the Landing Page Apps Script backend as the first source. The WhatsApp gateway is subsequent work, not the first activation. No external source registration or real submission is claimed by local tests.

`POST /api/ingest/lead` accepts PRD §23.2. Required fields are `source_channel` and an offset-bearing `occurred_at`; optional contact/company/inquiry/attribution groups use the documented names. Missing identity remains a retained DQ_NO_CONTACT inquiry. Normalization, resolution, q1, attribution and persistence use the same Phase 6 service as manual entry and CSV. A machine does not impersonate a human profile.

### Signing recipe for the landing-page backend

1. Serialize the complete payload once to UTF-8 JSON. Do not alter bytes after signing.
2. Use Unix timestamp seconds and uppercase `POST`. Sign `timestamp + ".POST./api/ingest/lead." + rawBody` using HMAC-SHA256 and lowercase hexadecimal output.
3. Send `X-Timestamp`, `X-Signature`, `Idempotency-Key`, and `Content-Type: application/json`. Use one durable submission UUID from the backend record; retain that key for every retry. Generate a fresh timestamp/signature for a later transport retry, keeping the body and idempotency key unchanged.
4. The timestamp tolerance is ±300 seconds, inclusive. The 256 KiB limit counts bytes, including requests without Content-Length. A request digest prevents replacing the unsigned idempotency header to replay the same signed anonymous inquiry.
5. 202 means durably received, not processing complete. A replay returns 200 and the stored receipt/current outcome with `replayed:true`; it does not run again. Validation returns 400 with field paths, authentication 401, oversized body 413, unsupported media 415. Transport/database unavailability returns 503. Never log the body, request headers, keys or raw upstream response.

Use server-side Script Properties for `PMOS_ORIGIN` and `INGEST_HMAC_SECRET`. Neither belongs in HTML/client JavaScript. The following reference uses [Google's HMAC utility](https://developers.google.com/apps-script/reference/utilities/utilities) and [UrlFetchApp](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app):

```javascript
function sendInquiryToPmos(payload, submissionId) {
  const properties = PropertiesService.getScriptProperties();
  const origin = properties.getProperty("PMOS_ORIGIN");
  const secret = properties.getProperty("INGEST_HMAC_SECRET");
  if (
    !/^https:\/\/[a-z0-9.-]+$/i.test(origin || "") ||
    !secret ||
    secret.length < 32
  )
    throw new Error("PM OS source configuration is incomplete");
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(submissionId || ""))
    throw new Error("A durable submission id is required");
  const path = "/api/ingest/lead";
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = Utilities.computeHmacSha256Signature(
    timestamp + ".POST." + path + "." + body,
    secret,
    Utilities.Charset.UTF_8,
  )
    .map(function (byte) {
      return (byte & 255).toString(16).padStart(2, "0");
    })
    .join("");
  const response = UrlFetchApp.fetch(origin + path, {
    method: "post",
    contentType: "application/json; charset=utf-8",
    payload: body,
    headers: {
      "X-Timestamp": timestamp,
      "X-Signature": signature,
      "Idempotency-Key": submissionId,
    },
    followRedirects: false,
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  if (status === 200 || status === 202) {
    const receipt = JSON.parse(response.getContentText());
    return {
      status: status,
      eventId: receipt.event_id,
      correlationId: receipt.correlation_id,
    };
  }
  // Persist only this classification against the existing backend submission record.
  // A later retry must reuse submissionId and the original payload.
  return { status: status, retryable: status >= 500 || status === 429 };
}
```

Source registration requires the actual Apps Script project and its operator-managed secret configuration. If host Deployment Protection requires a bypass, use its scoped automation credential only in the backend's protected configuration, never disable host protection or expose it to the browser. No source credential has been registered in this phase's local work.

### Server environment and rotation

`INGEST_HMAC_SECRET`, optional `INGEST_HMAC_SECRET_PREVIOUS`, and `CRON_SECRET` are SERVER-ONLY, independently generated values of at least 32 characters. Keep them distinct from each other and the Supabase secret. `JOBS_ENABLED=true` enables bearer-triggered jobs only with `APP_ENV=production`; manual authorized execution remains available locally. Absent keys mean NOT_CONFIGURED, not healthy. No new NEXT_PUBLIC variable exists.

Rotation: install new current + former previous on the server, update the Apps Script backend to the new current, verify delivery, then remove previous after in-flight deliveries/transport retries have switched. Both accepted keys are compared in constant time; tests verify old signatures fail once previous is removed. Never publish key values or include them in a URL.

### Queue and concurrency

Received events process through Next.js `after` following durable 202 acceptance. Retry claims use SKIP LOCKED plus a 90-second lease/fencing token. The event and lead commit finish atomically, so a response loss cannot leave a second lead. Expired workers leave recoverable rows. Failed-signature/media/size audit rows store no payload. Validly signed malformed content is retained but terminal. Payload retention is 90 days; deletion of payloads belongs to Phase 13 JOB-RETENTION.

Retryable INTERNAL/UPSTREAM/network/timeout errors receive full-jitter delays capped at 1m, 5m, 25m, 2h, 6h. Default five total attempts means the fifth failure becomes dead_letter, without a sixth automatic attempt. Terminal validation/business/authorization/conflict failures become rejected. Manual retry resets the attempt budget for a dead letter, preserving every previous attempt in integration_runs. It does not retry rejected authentication failures.

The per-job transaction advisory lock serializes acquisition; a running integration_runs lease covers subsequent pooled HTTP calls. No unsafe cross-request session advisory lock or separate lock table is used. Each invocation checks its 40-second budget, reserves 24 seconds before claiming an item, uses bounded 3-second machine database calls and processes at most min(jobs.max_batch, 500). The platform limit is 60 seconds; unfinished due rows remain the resumable queue. No arbitrary lookback can lose an old due event.

### Scheduler binding and infrastructure evidence

Operator decision: native ten-minute Vercel Cron is **not available until the actual plan is verified**. `vercel.json` deliberately contains no active cron, preserving Hobby compatibility and adding no paid dependency. The job registry declares JOB-RETRY-EVENTS with target `*/10 * * * *`. [Vercel documents Hobby's daily limit and GET invocation](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

`.github/workflows/retry-events.yml` provides the PRD-approved optional fallback. It stays inactive unless repository variable `PMOS_SCHEDULER=github`; configure `PMOS_ORIGIN` as the HTTPS deployment origin, repository secret `PMOS_CRON_SECRET`, and (only when required) scoped `PMOS_PROTECTION_BYPASS`. It calls the same bearer POST endpoint and refuses redirects. The off-hour offset runs at minutes 7/17/27/37/47/57. [GitHub permits intervals down to five minutes but can delay scheduled runs](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows); this is not a guaranteed ten-minute SLA.

If native cadence is later verified and approved, disable the fallback and replace the empty crons array with `[{"path":"/api/jobs/JOB-RETRY-EVENTS","schedule":"*/10 * * * *"}]`. Vercel's GET adapter accepts bearer auth only; cookie-authorized manual requests use same-origin POST. Never activate both schedulers. No pg_cron/pg_net extension or n8n infrastructure is introduced.

Deployed scheduler cadence and source registration remain infrastructure evidence to collect before integrated operation. Local foundation completion does not assert that a scheduled deployment fired. The current host protection and Phase 2 deployment backlog remain binding. Scheduler-wide outage alerts remain Phase 9; Phase 7 displays last-run/last-success evidence without pretending that absence is healthy.

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

At Phase 2 closure, local Supabase Auth was active; later job foundation changes are documented above. HubSpot, Slack, Meta and n8n remain unimplemented. Local Mailpit captures test messages; no production operator/contact data is seeded.

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

Phase 5 stores validated external reference identifiers and URLs only. It makes no network call, does not verify those references, and does not attach platform metrics. The Today experiment queue is an indexed database query, not a scheduler or integration.

- Phase 7: foundation choices resolved by D-013; actual source registration, host protection, hosting-plan verification and scheduler activation remain pending. Scheduler-wide outage alerts belong to Phase 9.
- Phase 8: manual qualification override behavior relative to HubSpot lifecycle authority.
- Phase 9: Slack INFO routing.
- Phase 13/deployment planning: remaining real-data and production sequencing.

These items must be resolved before their owning phase is implemented. They do not expand Phase 0.
