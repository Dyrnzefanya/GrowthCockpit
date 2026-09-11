# Architecture

## Authority and system shape

The Master PRD in `PRD.md` is authoritative. Du Anyam Performance Marketing OS is a single Next.js application deployed on Vercel with Supabase for PostgreSQL, authentication, and storage. The browser uses only the Supabase URL and anonymous key. Privileged database access and all external API access remain server-side.

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

## Frontend strategy

Phase 0 provides App Router, React, Tailwind CSS, and default shadcn/ui configuration plus a plain placeholder. Phase 1 establishes the design system and responsive shell before feature work. Later features are vertical slices through the established layers. The frontend presents decisions and workflows; it does not calculate authoritative business outcomes.

## Backend and database strategy

Route handlers and scheduled endpoints are thin boundaries. Services coordinate use cases. Domain modules implement deterministic logic. Repositories are the only layer that accesses Supabase. Schema changes are forward-only SQL migrations. Every future table in `public` must enable RLS and define policies in the same migration.

Phase 0 creates no product tables. Its only database change enables `pgcrypto` and `citext` and defines the shared `public.set_updated_at()` trigger function.

## Runtime and sequencing

Asia/Jakarta is the business timezone. Currency storage, conversion, attribution, lead/contact meaning, funnel calculation, and decision rules follow the PRD and are implemented only in their owning phases. Scheduled jobs run only in production after their phase is complete. n8n is not part of the current runtime.

One phase must pass its documented gate before work begins on the next phase.
