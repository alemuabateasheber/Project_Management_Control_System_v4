# ADR-001: Monorepo and incremental migration

**Status:** Proposed

## Context

The current PMCS prototype is a Vite/FastAPI application backed by generic
`public.records` JSON data. It has useful workflows and data to preserve, but
does not provide the normalized relationships, tenant boundary, or controlled
workflow history required by the target platform. A big-bang replacement would
put production data reconciliation and feature continuity at unnecessary risk.

## Decision

Adopt a pnpm-workspace monorepo, coordinated with Turborepo, for the target
TypeScript platform. The intended deployables are `apps/web`, `apps/api`, and
`apps/worker`; shared contracts, database assets, UI, validation, and tooling
live in versioned `packages/*` workspaces.

Migrate incrementally. The new normalized `pmcs` PostgreSQL namespace will run
beside the legacy `public` namespace. Deliver vertical domain slices, reconcile
their source data, and cut them over only after acceptance checks pass. At any
time, each domain has exactly one write authority; legacy and target systems
must not both accept writes for the same business record.

## Alternatives considered

- **Big-bang rewrite and data import:** faster apparent convergence, but too
  risky for data quality, user continuity, and rollback.
- **Modify the generic JSON record store in place:** retains existing APIs but
  cannot reliably enforce foreign keys, typed financial data, or tenancy.
- **Separate repositories for web, API, and worker:** provides independence but
  makes shared contracts and atomic cross-layer changes harder during migration.

## Consequences

- Shared TypeScript contracts and coordinated release tooling reduce drift.
- Migration requires explicit source mapping, reconciliation evidence, and
  feature-by-feature cutover plans.
- The legacy schema remains read-only as a source after a domain cutover and is
  retired only after retention and recovery obligations are satisfied.
- Workspace tooling and dependency boundaries must be maintained deliberately;
  a monorepo is not permission to couple domain modules.

