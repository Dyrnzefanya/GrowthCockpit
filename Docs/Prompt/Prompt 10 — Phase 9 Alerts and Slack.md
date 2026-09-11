Implement **Phase 9 — Alerts & Slack** ONLY.

Discover/read relevant:

- alert/event modeling
- Slack
- security/privacy
- UI UX Pro Max
- notification UX
- testing
- Superpowers

Build alert DOMAIN before Slack.

Implement:

- alerts
- deterministic keys
- severity
- lifecycle
- occurrence count
- dedupe
- acknowledge
- snooze
- resolve
- suppress
- auto-resolve
- evidence
- entity references
- notification state
- notification attempts
- alert producers
- quiet hours
- daily cap
- digest collapse
- playbook links

Then implement Slack outbound delivery.

Implement jobs:

- `JOB-STALE-LEADS`
- `JOB-DATA-HEALTH`
- `JOB-NOTIFY-DISPATCH`

Activate Today Alerts and integration notification health.

# PRIVACY

Slack must not contain:

- contact name
- email
- phone
- message body

Use a PII-safe allowlist serializer.

Slack failure must not break PM OS.

Do not implement interactive Slack.

Use UI/UX skill to make alerts communicate:

severity
→ problem
→ evidence
→ required action.

Perform browser and notification UX review.

Return:

# PHASE 9 STATUS
PASS / FAIL

## Skills / Tools Utilized
## Alert UX Review
## Privacy Review
## Slack Review
## Tests
## Acceptance Criteria

STOP.