# Architecture

## Authority and system shape

The Master PRD in `PRD.md` is authoritative, with the explicit operator API-key clarification recorded in D-007. Du Anyam Performance Marketing OS is a single Next.js application deployed on Vercel with Supabase for PostgreSQL, authentication, and storage. The browser uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Privileged database access and all external API access remain server-side.

The PM OS owns operational business logic. HubSpot is the CRM source of truth for contact and lifecycle data. Supabase is the PM OS operational database and analytics mirror. External systems transport or store data; they do not define PM OS business rules.

## Layer boundaries

| Layer              | Responsibility                                                 | Must not contain                                           |
| ------------------ | -------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/app`          | App Router pages, layouts, route handlers, server entry points | Reusable business rules                                    |
| `src/components`   | Presentational React components                                | Business rules, direct database access, external API calls |
| `src/domain`       | Pure entities, invariants, deterministic rules                 | Framework, database, or vendor dependencies                |
| `src/services`     | Use-case coordination and transaction orchestration            | Rendering code or vendor transport details                 |
| `src/repositories` | Supabase queries and database/domain mapping                   | External API calls or presentation logic                   |
| `src/integrations` | External API and webhook adapters                              | Ownership of PM OS rules                                   |
| `src/lib`          | Small shared technical helpers and environment access          | Feature-specific business rules                            |
| `src/types`        | Shared technical and generated database types                  | Runtime behavior                                           |
| `src/config`       | Static configuration and validation schemas                    | Secrets or feature logic                                   |

Dependencies flow from app entry points through services to domain, repositories, and integrations. Server-only modules use `import "server-only"`. Client code may import only the public environment module.

Normal server requests also use the publishable key together with the authenticated user's session, preserving RLS. `SUPABASE_SECRET_KEY` is consumed only by the guarded privileged admin client (plus isolated Node test infrastructure), never by user settings/auth repositories as an authorization shortcut. Modern keys are passed to the installed SDK without custom transport or JWT conversion. `APP_ENV`, `APP_BASE_URL` and `APP_TIMEZONE` remain server-only; all six core variables are mandatory. Legacy variable names are not aliases.

## Frontend strategy

Phase 0 provides App Router, React, Tailwind CSS, and default shadcn/ui configuration plus a plain placeholder. Phase 1 establishes the design system and responsive shell before feature work. Later features are vertical slices through the established layers. The frontend presents decisions and workflows; it does not calculate authoritative business outcomes.

Phase 1 implementation: `src/styles/tokens.css` owns the light-mode token system. `src/components/ui/` contains shadcn/Radix primitives; shared operational components sit in `src/components/`. `src/config/navigation.ts` is the shared navigation and breadcrumb source. The `(app)` and `(auth)` route groups are ready for Phase 2 protection without route restructuring.

Static skeleton content is rendered on the server. The shared shell's navigation/drawer, date-range form, and gallery interaction examples are client islands. URL parameters hold filters; no business data is fetched. `/dev/gallery` checks server-only `APP_ENV` on every request and returns 404 outside development. The gallery's illustrative records are never imported by product route skeletons.

## Backend and database strategy

Phase 2 adds invite-only magic-link authentication. `src/proxy.ts` refreshes cookies and verifies the user with Supabase Auth on each protected request. The `(app)` layout and settings actions independently require a verified user. Cookies are HttpOnly, Secure and SameSite=Lax; the browser Supabase client is anonymous and does not manage sessions. The server-only admin client is never imported by browser components. Auth transport and database queries stay in repositories, actions coordinate in services, and forms render input/state only. `can(action)` is the sole role check.

`/auth/confirm` validates the Supabase one-time email token and restricts `next` to internal application routes. All redirect origins come from the trusted server-only `APP_BASE_URL`. Protected responses are private/no-store. Settings inputs are Zod-validated; invalid input remains visible and failed writes do not report success. Missing profiles and malformed settings have recoverable UI states. No future feature is activated by seeding its documented configuration default.

Route handlers and scheduled endpoints are thin boundaries. Services coordinate use cases. Domain modules implement deterministic logic. Repositories are the only layer that accesses Supabase. Schema changes are forward-only SQL migrations. Every future table in `public` must enable RLS and define policies in the same migration.

Phase 0 creates no product tables. Its only database change enables `pgcrypto` and `citext` and defines the shared `public.set_updated_at()` trigger function.

## Runtime and sequencing

Asia/Jakarta is the business timezone. Currency storage, conversion, attribution, lead/contact meaning, funnel calculation, and decision rules follow the PRD and are implemented only in their owning phases. Scheduled jobs run only in production after their phase is complete. n8n is not part of the current runtime.

One phase must pass its documented gate before work begins on the next phase.
