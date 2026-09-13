# Development Protocol

`PRD.md` is the primary source of truth. Read the active phase and every referenced section before changing architecture or behavior.

## Standing rules

1. Implement one explicitly requested phase at a time, then stop at its gate.
2. Do not invent requirements. Record unresolved gaps in `DECISIONS.md` or `TASKS.md` at their earliest blocking phase.
3. Record every architectural deviation before implementation. Do not add a dependency, table, service, public endpoint, or abstraction without a real need and a `DECISIONS.md` entry.
4. Prefer the simplest implementation that satisfies the PRD.
5. Keep TypeScript strict. Do not use `any` without an adjacent `// why:` comment.
6. Put business rules in `src/domain/`, application coordination in `src/services/`, Supabase access in `src/repositories/`, and external API code in `src/integrations/`.
7. React components remain presentational. Job handlers and database functions do not own business logic.
8. Validate external input with Zod at the boundary.
9. Never expose or log secrets, tokens, or personally identifiable information.
10. Apply every schema change through a forward-only migration. Never edit an applied migration. Enable RLS and add policies in the same migration as every future public table.
11. Do not fabricate unavailable metrics or data. Automatic campaign modification is prohibited.
12. Deterministic rules precede AI. n8n is not runtime infrastructure; it may later orchestrate existing endpoints only after a concrete need is approved.
13. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before declaring a phase complete. Run every phase-specific test as well.
14. A phase is engineering-complete only when its implementation, technical acceptance criteria, tests, security/RLS checks, migrations/schema validation, build, applicable accessibility/performance checks, and documentation have evidence with no critical issue remaining.

## Completion evidence policy

- Track engineering Definition of Done separately from operational validation/UAT.
- Operational evidence that requires real operator use, real business data, elapsed time, or production activity remains `PENDING` until it actually occurs. Never substitute fixtures or automated tests for that evidence.
- Pending operational evidence does not make an engineering-complete phase fail or block the next engineering phase unless the PRD explicitly makes it a hard dependency.
- An implementation defect, failed technical acceptance criterion, security/RLS failure, migration/schema failure, build failure, or explicit hard dependency still makes the phase fail.

## Current scope

The operator has authorized Phase 6 — Lead & Funnel Core only. Contact = person; lead = inquiry event; one contact may have multiple leads. Apply the operator's inclusive rolling 24-hour duplicate window for matching normalized contact/product and retain uncontactable inquiries with contact_id=null and DQ_NO_CONTACT (DECISIONS.md D-011). Preserve the Phase 2–6 Operational Validation Backlog in TASKS.md. Engineering completion and pending real-use UAT are tracked separately under the operator's closure policy. Do not begin Phase 7 or add external integrations, automated ingest, jobs, alerts, AI, automated platform metrics, or campaign modification.

UI conventions: use `src/styles/tokens.css` and semantic Tailwind utilities; use shared components instead of feature-specific replacements. Illustrative data belongs only under the server-gated development gallery. Route pages remain Server Components unless they need interaction. Keep filters and date ranges in URL parameters. Above 500 rows, tables require injected server pagination.

Verification also includes `npm run test:e2e` (real local auth, axe, interactions, responsive screenshots), `npm run test:db` (local RLS/provisioning/audit), `npm run secrets:client`, and `npm run test:production` after a production-mode build (gallery exclusion and local paint budget). Browser fixtures refuse remote Supabase and create/delete synthetic local identities. Never run them against a real workspace. Host deployment protection must be enabled before any deployment; local evidence cannot satisfy the Phase 2 deployed-auth gate.

## Required phase report

Report the phase status, requirement IDs, files, migrations, actual quality-gate results, acceptance evidence, architectural decisions, unresolved issues, and the recommended next step. Do not begin the next phase without an explicit instruction.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
