# PMCS Database Package

This package owns the normalized PostgreSQL `pmcs` schema. The legacy FastAPI
application continues to use the `public` schema during incremental migration.

## Configuration

Copy `.env.example` to `.env` and set a PostgreSQL `DATABASE_URL` using the
`postgresql://` or `postgres://` protocol. The URL must point to the target
PMCS database, not the legacy `mint_aics_pmo` connection configured at the
repository root.

## Commands

```bash
npm install
npm run validate
npm run generate
npm run migrate:deploy
npm run migrate:hardening
PMCS_SEED_ADMIN_PASSWORD='use-a-local-development-password' npm run db:seed
```

Run `migrate:hardening` only after Prisma has created the `pmcs` tables. It
installs tenant RLS, append-only protections, and database constraints from
`prisma/sql/001-foundation-hardening.sql`.

The seed is idempotent and development-only. It creates or updates the
`pmcs-development` organization, a local administrator identity, the
administrator role, and the initial permission set. It refuses to run when
`NODE_ENV=production` and requires `PMCS_SEED_ADMIN_PASSWORD` explicitly.

## Migration order

1. Apply Prisma migrations with `npm run migrate:deploy`.
2. Apply reviewed PostgreSQL hardening with `npm run migrate:hardening`.
3. Seed local development data with `npm run db:seed`.
4. Start the API only after the target database and RLS context are available.

Do not point these commands at the legacy `public` schema or run them against a
production database without an approved migration and backup plan.
