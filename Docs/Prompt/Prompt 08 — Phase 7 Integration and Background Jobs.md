Implement **Phase 7 — Integration & Background Job Foundation** ONLY.

n8n must NOT be introduced.

Verify MVP Core.

Discover/read relevant:

- API architecture
- webhook security
- security/cryptography
- PostgreSQL concurrency
- background jobs
- retry/idempotency
- observability
- testing
- Superpowers

Implement:

- `/api/ingest/lead`
- HMAC-SHA256
- timestamp validation
- replay protection
- constant-time comparison
- secret rotation
- idempotency
- payload limit
- content-type validation
- webhook_events
- retry queue
- retry classification
- backoff
- dead letter
- correlation IDs
- integration_runs
- sync_state
- job registry
- job runner
- advisory locks
- bounded batches
- timeout behavior
- `/api/jobs/[job]`
- CRON_SECRET
- manual job execution
- scheduler binding
- scheduler fallback
- integration health
- manual retry

Implement:

`JOB-RETRY-EVENTS`

Activate `/integrations` and Today Data Health.

All lead ingest must use the SAME Phase 6 lead service.

Do not duplicate business logic in route handlers.

# SECURITY TESTS

Test:

- valid/invalid signature
- tampering
- replay
- stale request
- duplicate request
- concurrency
- oversized body
- invalid content type
- wrong cron secret
- concurrent job
- retry
- dead letter
- rotation
- idempotency

Use security/review skills if available.

Return:

# PHASE 7 STATUS
PASS / FAIL

## Skills / Tools Utilized
## Security Review
## Integration Architecture Review
## Tests
## Acceptance Criteria
## Issues

STOP.