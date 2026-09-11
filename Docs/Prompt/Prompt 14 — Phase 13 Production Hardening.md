Implement **Phase 13 — Production Hardening** ONLY.

Read the complete PRD again.

Review the entire implementation Phase 0–12.

Discover/read relevant:

- security audit
- code review
- PostgreSQL/Supabase
- RLS
- performance
- accessibility
- Playwright/E2E
- observability
- deployment
- Git/GitHub
- backup/recovery
- Superpowers

Use specialized audit/review skills where available.

Do NOT add major features.

# AUDIT AND HARDEN

## Authentication
Verify invite-only access, sessions and protected routes.

## RLS
Audit every public table and policy.

## Secrets
Audit:

- source
- Git
- Git history
- environment
- client bundles
- logs

## PII
Audit:

- logs
- errors
- integration runs
- Slack
- webhook storage

## Webhooks

Test:

- forged signature
- replay
- stale timestamp
- malformed body
- oversized body
- secret rotation

## Jobs

Test:

- invalid cron secret
- concurrency
- lock
- timeout
- retry
- scheduler failure
- exhaustion

## Integrations

Simulate:

- HubSpot unavailable
- Meta unavailable
- Slack unavailable
- scheduler unavailable

Core PM OS must degrade gracefully.

## Observability

Verify:

- health endpoint
- integration runs
- correlation IDs
- data health
- failed jobs
- scheduler self-check

## Database

Verify:

- clean migrations
- indexes
- constraints
- RLS
- backup

Perform an ACTUAL restore drill.

## Retention

Implement and verify:

`JOB-RETENTION`

according to PRD.

## Performance

Measure actual PRD-defined assumptions.

## Accessibility

Audit critical routes.

## FULL E2E

Use Playwright/browser tooling to execute:

login
→ Today
→ workflow
→ lead
→ qualification
→ funnel
→ experiment
→ integrations
→ performance
→ recommendation
→ report

Perform final visual inspection of critical routes.

Update:

- deployment runbook
- recovery runbook
- security checklist
- troubleshooting
- production checklist

# FINAL OUTPUT

# PHASE 13 STATUS
PASS / FAIL

# PRODUCTION READINESS
READY / NOT READY

## Skills / Tools Utilized

## Security Audit

## Authentication Audit

## RLS Audit

## Secrets Audit

## PII Audit

## Webhook Security

## Job Reliability

## Integration Resilience

## Observability

## Backup / Restore

## Retention

## Performance

## Accessibility

## E2E

## Visual QA

## Full Quality Gates

## Technical Debt

## Business Decisions

## Deployment Recommendation

Do not mark READY if any critical security, RLS, integrity, recovery or integration-resilience issue remains.

STOP.