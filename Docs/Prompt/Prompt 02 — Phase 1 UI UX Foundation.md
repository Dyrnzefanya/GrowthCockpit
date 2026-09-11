Implement **Phase 1 — UI/UX Foundation & Application Shell** ONLY.

# BEFORE IMPLEMENTATION

Read:

- Master PRD v3.0
- AGENTS.md
- ARCHITECTURE.md
- current TASKS.md
- relevant Phase 1 requirements
- Phase 0 completion state

Verify Phase 0 still passes.

Discover/read relevant installed skills.

For this phase strongly prioritize available:

- UI UX Pro Max
- Ponytail
- Superpowers
- frontend design skills
- Next.js/React skills
- Tailwind/shadcn skills
- accessibility skills
- browser/Playwright skills

Do not claim a skill was used unless actually available and invoked.

# UX OBJECTIVE

Create a serious internal **Performance Marketing Operating System**.

Optimize for:

- clarity
- fast scanning
- information hierarchy
- operational speed
- data density
- consistency
- accessibility
- desktop productivity
- responsive use

Avoid generic AI SaaS appearance.

Avoid unnecessary:

- gradients
- giant typography
- oversized cards
- excessive rounded containers
- decorative charts
- animations
- excessive whitespace
- arbitrary colours

# IMPLEMENT DESIGN SYSTEM

Implement PRD-defined:

- colors
- status semantics
- typography
- spacing
- radius
- elevation
- focus styles

Implement reusable operational components including:

- PageHeader
- SectionCard
- MetricCard
- MetricDelta
- DataTable
- FilterBar
- StatusBadge
- AlertItem
- IntegrationHealthCard
- Timeline
- DetailDrawer
- ConfirmDialog
- LoadingSkeleton
- EmptyState
- ErrorState
- StaleBanner
- NotConnectedState

Implement:

- app shell
- sidebar
- header
- navigation
- environment badge
- page container
- breadcrumbs where applicable
- responsive drawer
- global date-range UI

# ROUTE SKELETON

Create:

- `/today`
- `/performance`
- `/leads`
- `/leads/[id]`
- `/funnel`
- `/experiments`
- `/playbook`
- `/workflows`
- `/reports`
- `/integrations`
- `/settings`
- `/login`

Future routes must display honest unactivated states.

Never show fake production:

- revenue
- spend
- leads
- MQL
- campaigns
- CRM records
- charts

Illustrative data is allowed only in the PRD-defined env-gated `/dev/gallery`.

# VISUAL VERIFICATION — REQUIRED

Use available browser/Playwright/browser-agent capabilities.

Actually inspect the rendered application.

Verify:

- desktop
- mobile ~390px
- sidebar
- navigation
- loading
- empty
- error
- unconnected states
- focus
- keyboard navigation
- overflow
- clipping
- typography
- spacing
- table behavior

Use UI UX Pro Max or other available design review skill for a final visual review if available.

Fix visible problems before PASS.

# DO NOT IMPLEMENT

- auth functionality
- business database tables
- workflows
- experiments
- leads
- CRM
- Meta
- Slack
- reporting

# COMPLETE

Run lint, typecheck, tests, accessibility tests, Playwright and build.

Return:

# PHASE 1 STATUS
PASS / FAIL

## Skills / Tools Utilized

## UI/UX Review

## Responsive Review

## Accessibility Review

## Requirements Completed

## Tests

## Acceptance Criteria

## Unresolved Issues

STOP.

Do not begin Phase 2.