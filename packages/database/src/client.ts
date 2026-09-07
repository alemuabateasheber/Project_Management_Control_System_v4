import { Prisma, PrismaClient } from "@prisma/client";

export { Prisma, PrismaClient };

/**
 * Authenticated tenant context established by the API guard, never by a
 * request header alone. The values are installed with `SET LOCAL`, so they
 * cannot leak from a completed transaction into a later pooled connection.
 */
export interface TenantContext {
  organizationId: string;
  membershipId?: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, field: keyof TenantContext): void {
  if (!UUID_PATTERN.test(value)) {
    throw new TypeError(`${field} must be a UUID before setting PMCS RLS context`);
  }
}

/**
 * Install PostgreSQL RLS context in an existing interactive transaction.
 * Call this before any tenant query when a use case already owns the
 * transaction (for example, a command that writes business data and an outbox
 * event atomically).
 */
export async function setTenantContext(
  tx: Prisma.TransactionClient,
  tenant: TenantContext,
): Promise<void> {
  assertUuid(tenant.organizationId, "organizationId");

  await tx.$executeRaw`
    SELECT set_config('pmcs.organization_id', ${tenant.organizationId}, true)
  `;

  if (tenant.membershipId) {
    assertUuid(tenant.membershipId, "membershipId");
    await tx.$executeRaw`
      SELECT set_config('pmcs.membership_id', ${tenant.membershipId}, true)
    `;
  }
}

/**
 * Run a unit of work inside an interactive transaction with PMCS tenant RLS
 * variables set. Use this at application-service boundaries; do not call it
 * inside an existing Prisma transaction.
 */
export async function withTenant<T>(
  client: PrismaClient,
  tenant: TenantContext,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await setTenantContext(tx, tenant);
    return work(tx);
  });
}

/**
 * A Nest-compatible Prisma client. Nest recognizes `onModuleInit` and
 * `onModuleDestroy` lifecycle method names without this package taking a hard
 * dependency on `@nestjs/common`.
 */
export class PmcsPrismaClient extends PrismaClient {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async withTenant<T>(
    tenant: TenantContext,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return withTenant(this, tenant, work);
  }
}

export function createPmcsPrismaClient(
  options?: Prisma.PrismaClientOptions,
): PmcsPrismaClient {
  return new PmcsPrismaClient(options);
}
