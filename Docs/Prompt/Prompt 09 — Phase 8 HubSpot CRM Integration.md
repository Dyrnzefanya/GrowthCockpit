Implement **Phase 8 — HubSpot CRM Integration** ONLY.

Read PRD ownership rules carefully.

Discover/read relevant:

- HubSpot/API skills
- CRM integration
- webhook
- security
- retry/idempotency
- observability
- testing
- Superpowers

Use current authoritative HubSpot documentation when API behavior is required.

Do not guess API contracts.

# BINDING RULE

HubSpot = CRM SOURCE OF TRUTH.

PM OS must not become a second CRM.

# IMPLEMENT

Implement:

- HubSpot client
- authentication
- retry
- rate limits
- throttling
- contacts
- companies
- deals
- associations
- lifecycle mapping
- deal-stage mapping
- owner mapping
- webhook receiver
- signature verification
- cursor sync
- reconciliation
- overlap
- external IDs
- idempotent upserts
- stage events
- deal-to-lead linking
- deep links
- manual resync
- health
- approved narrow write-back
- lifecycle write-back feature flag
- won-deal attribution stamp

Implement:

`JOB-HUBSPOT-RECONCILE`

Activate:

- `/integrations/hubspot`
- HubSpot lead-detail information
- mappings/settings

Unknown mappings must produce warnings.

Ambiguous contacts must not auto-merge.

Never write HubSpot-owned:

- deal stage
- owner
- amount

unless PRD explicitly allows it.

Run integration fixtures and failure scenarios.

Perform browser verification of HubSpot surfaces.

Return:

# PHASE 8 STATUS
PASS / FAIL

## Skills / Tools Utilized
## HubSpot Contract Review
## Ownership Compliance
## Tests
## Acceptance Criteria
## Issues

STOP.