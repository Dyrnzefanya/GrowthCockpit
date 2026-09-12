Implement **Phase 2 — Authentication & Security Foundation** ONLY.

Read Master PRD, AGENTS.md, ARCHITECTURE.md, DATA_MODEL.md and Phase 2 requirements.

Verify previous phases.

Discover/read relevant available:

- Supabase skills
- PostgreSQL skills
- authentication skills
- security skills
- testing skills
- Superpowers

# IMPLEMENT

Implement:

- Supabase Auth
- invite-only access
- disabled public signup
- PRD-approved auth method
- profiles
- app_settings
- provisioning trigger
- RLS baseline
- protected `(app)` routes
- server-side session validation
- login
- logout
- safe `next=` redirects
- open redirect protection
- server admin Supabase client
- `can(action)` authorization helper
- settings validation
- settings audit metadata

Apply Phase 2 migrations.

Regenerate database TypeScript types.

Activate real:

- `/login`
- relevant `/settings`

# SECURITY REVIEW

Verify:

- no inappropriate anon access
- RLS correct
- service role server-only
- service role absent from browser bundles
- protected routes cannot be bypassed
- redirects cannot escape the application
- malformed settings fail safely

Use security review skills if available.

Use browser/E2E tooling to test real login/logout/protected navigation.

# DO NOT IMPLEMENT

Phase 3+ features.

# COMPLETE

Run all quality gates.

Return:

# PHASE 2 STATUS
PASS / FAIL

## Skills / Tools Utilized
## Security Review
## RLS Review
## Requirements Completed
## Tests
## Acceptance Criteria
## Issues

STOP.