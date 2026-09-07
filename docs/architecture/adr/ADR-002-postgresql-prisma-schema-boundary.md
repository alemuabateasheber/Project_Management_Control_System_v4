# ADR-002: PostgreSQL and Prisma schema boundary

**Status:** Proposed

## Context

PMCS requires transactional project controls, financial precision, reporting
queries, immutable evidence, and referentially safe tenant relationships. The
legacy generic JSON store cannot express these rules. Prisma improves typed
application access, but it does not replace PostgreSQL security, integrity, or
operational features.

## Decision

Use PostgreSQL as the authoritative transactional store and Prisma as the
typed application data-access and ordinary-schema migration layer. New PMCS
tables live in the `pmcs` namespace; legacy `public` tables stay isolated
during migration.

Use UUID keys, UTC `timestamptz` event times, `numeric` for money and EVM
values, foreign keys, check constraints, targeted indexes, and aggregate
version columns. Prisma migrations own normal tables, relations, and indexes.
Reviewed SQL migrations own PostgreSQL-specific capabilities, including
extensions, database roles/grants, RLS policies, append-only protections,
partial or specialized indexes, and any tenant-aware constraint Prisma cannot
represent safely.

## Alternatives considered

- **JSONB-first or document database model:** flexible initially, but weak for
  controlled relationships, reporting, and financial integrity.
- **Prisma-only migrations:** simpler tooling, but obscures critical database
  protections that must be explicitly reviewed and tested.
- **Hand-written SQL for all access and migrations:** maximum database control,
  but sacrifices the typed repository boundary and increases application drift.

## Consequences

- Database constraints remain the final integrity boundary; services cannot
  rely solely on ORM validation.
- Financial calculations must use decimal-safe values, never JavaScript
  floating point.
- Schema releases need ordered, reviewable Prisma and SQL migrations plus
  migration compatibility tests.
- Repository responses remain mapped to explicit API contracts rather than
  exposing Prisma models directly.

