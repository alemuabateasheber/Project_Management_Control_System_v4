# ADR-004: Tenant isolation and Row-Level Security

**Status:** Proposed

## Context

PMCS is designed for multiple organizations in a shared platform. A missing
organization predicate, an insecure direct-object reference, or an incorrectly
joined relationship could expose one tenant's project-control or financial data
to another. Application-level filters alone are insufficient defense.

## Decision

Use a shared PostgreSQL database with strong logical tenant isolation. Every
tenant-owned table has a non-null `organization_id`. Parent tables expose
tenant-aware unique keys and child relationships use composite foreign keys
that include `organization_id` where practical.

Authorization first resolves an active, authorized organization membership.
Within the same database transaction, the API sets transaction-local
organization and membership settings with `SET LOCAL`. Tenant tables use
`ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` policies based on
that context. The normal application role cannot use `BYPASSRLS`; narrowly
scoped migration and backup roles are separately controlled.

Object storage keys are tenant-prefixed, but every upload and download is also
reauthorized by the API. Tenant-isolation tests must prove that one
organization cannot list, retrieve, or mutate another organization's records.

## Alternatives considered

- **Application filters only:** lower initial effort but vulnerable to a
  missed predicate or repository defect.
- **Database schema per tenant:** stronger separation but high migration and
  operations cost for a growing SaaS tenant population.
- **Database per tenant:** suitable for exceptional contractual requirements,
  but unnecessary operational overhead for the initial platform.

## Consequences

- All tenant data access must execute inside a transaction; pooled connections
  cannot carry tenant context across requests.
- SQL migrations, support tooling, reporting jobs, and tests must establish
  tenant context correctly.
- Cross-organization administrative or portfolio operations require explicit,
  audited policy paths rather than bypassing tenant filters.
- Dedicated databases remain an available future deployment tier for tenants
  that require physical isolation.

