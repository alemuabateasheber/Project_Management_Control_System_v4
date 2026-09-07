import { Injectable } from '@nestjs/common';
import { PmcsPrismaClient } from '@pmcs/database';

/**
 * The only Prisma client instance owned by the API process. Tenant-scoped
 * application services must use `withTenant` for every tenant data operation;
 * unscoped queries are limited to identity/bootstrap and platform health.
 */
@Injectable()
export class PrismaService extends PmcsPrismaClient {}
