const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const permissionDefinitions = [
  ['organization:read', 'View organization data'],
  ['project:read', 'View projects'],
  ['project:create', 'Create projects'],
  ['project:update', 'Update projects'],
  ['project:manage_members', 'Manage project membership'],
  ['fund:read', 'View fund balances'],
  ['transaction:read', 'View financial transactions'],
  ['transaction:create', 'Create and complete financial transactions'],
  ['transaction:reverse', 'Reverse completed financial transactions'],
  ['budget:read', 'View budgets and utilization'],
  ['budget:manage', 'Manage budgets and budget alerts'],
  ['report:export', 'Export financial reports'],
  ['audit:read', 'View audit events'],
];

async function main() {
  const password = process.env.PMCS_SEED_ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('PMCS_SEED_ADMIN_PASSWORD must be supplied and contain at least 12 characters');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The development seed must not run with NODE_ENV=production');
  }

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { slug: 'pmcs-development' },
      update: {},
      create: {
        slug: 'pmcs-development',
        legalName: 'PMCS Development Organization',
        displayName: 'PMCS Development',
        defaultCurrency: 'USD',
        settings: {},
      },
    });

    // RLS is already active when the documented seed order is followed.
    // Scope all tenant-owned seed records to the organization just created.
    await tx.$executeRaw`
      SELECT set_config('pmcs.organization_id', ${organization.id}, true)
    `;

    const user = await tx.user.upsert({
      where: { id: '00000000-0000-4000-8000-000000000001' },
      update: { displayName: 'PMCS Administrator', status: 'active' },
      create: {
        id: '00000000-0000-4000-8000-000000000001',
        displayName: 'PMCS Administrator',
        status: 'active',
      },
    });

    await tx.userIdentity.upsert({
      where: {
        provider_issuer_subject: {
          provider: 'local',
          issuer: '',
          subject: 'admin@pmcs.local',
        },
      },
      update: { loginIdentifier: 'admin@pmcs.local', verifiedAt: new Date() },
      create: {
        userId: user.id,
        provider: 'local',
        issuer: '',
        subject: 'admin@pmcs.local',
        loginIdentifier: 'admin@pmcs.local',
        verifiedAt: new Date(),
      },
    });

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await tx.passwordCredential.upsert({
      where: { userId: user.id },
      update: { passwordHash, algorithm: 'argon2id', changedAt: new Date(), mustRotate: false },
      create: { userId: user.id, passwordHash, algorithm: 'argon2id', mustRotate: false },
    });

    const membership = await tx.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
      update: { status: 'active', endedAt: null },
      create: { organizationId: organization.id, userId: user.id, status: 'active' },
    });

    const role = await tx.role.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: 'system_admin' } },
      update: { name: 'System Administrator', isSystem: true },
      create: {
        organizationId: organization.id,
        code: 'system_admin',
        name: 'System Administrator',
        description: 'Development administrator role',
        isSystem: true,
      },
    });

    for (const [code, description] of permissionDefinitions) {
      const permission = await tx.permission.upsert({
        where: { code },
        update: { description },
        create: { code, description },
      });
      await tx.rolePermission.upsert({
        where: {
          organizationId_roleId_permissionId: {
            organizationId: organization.id,
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { organizationId: organization.id, roleId: role.id, permissionId: permission.id },
      });
    }

    await tx.membershipRole.upsert({
      where: {
        organizationId_membershipId_roleId: {
          organizationId: organization.id,
          membershipId: membership.id,
          roleId: role.id,
        },
      },
      update: {},
      create: { organizationId: organization.id, membershipId: membership.id, roleId: role.id },
    });

    return { organizationId: organization.id, userId: user.id, membershipId: membership.id };
  });

  console.log(JSON.stringify({ event: 'pmcs_seed_completed', ...result }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
