import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { TenantContext } from '@pmcs/database';
import { Prisma } from '@pmcs/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { ListProjectsQuery } from './dto/list-projects.query';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async list(tenant: TenantContext, query: ListProjectsQuery) {
    await this.authService.assertPermission(tenant, 'project:read');
    return this.prisma.withTenant(tenant, async (tx) => {
      const where: Prisma.ProjectWhereInput = {
        organizationId: tenant.organizationId,
        deletedAt: null,
        ...(query.status ? { lifecycleStatus: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        tx.project.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: {
            id: true,
            code: true,
            name: true,
            lifecycleStatus: true,
            priority: true,
            health: true,
            currency: true,
            plannedStartDate: true,
            plannedFinishDate: true,
            version: true,
            updatedAt: true,
          },
        }),
        tx.project.count({ where }),
      ]);
      return {
        items,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          pageCount: Math.ceil(total / query.pageSize),
        },
      };
    });
  }

  async get(tenant: TenantContext, projectId: string) {
    await this.authService.assertPermission(tenant, 'project:read');
    return this.prisma.withTenant(tenant, async (tx) => {
      const project = await tx.project.findUnique({
        where: { organizationId_id: { organizationId: tenant.organizationId, id: projectId } },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          objectives: true,
          scope: true,
          lifecycleStatus: true,
          priority: true,
          health: true,
          currency: true,
          plannedStartDate: true,
          plannedFinishDate: true,
          actualStartDate: true,
          actualFinishDate: true,
          managerMembershipId: true,
          sponsorMembershipId: true,
          deletedAt: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!project || project.deletedAt !== null) {
        throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
      }
      const { deletedAt: _deletedAt, ...publicProject } = project;
      return publicProject;
    });
  }

  async create(tenant: TenantContext, input: CreateProjectDto) {
    await this.authService.assertPermission(tenant, 'project:create');
    if (input.managerMembershipId && input.managerMembershipId !== tenant.membershipId) {
      await this.authService.assertPermission(tenant, 'project:manage_members');
    }
    try {
      return await this.prisma.withTenant(tenant, async (tx) =>
        tx.project.create({
          data: {
            organizationId: tenant.organizationId,
            code: input.code.trim(),
            name: input.name.trim(),
            description: input.description?.trim(),
            lifecycleStatus: input.lifecycleStatus ?? 'proposed',
            priority: input.priority ?? 'medium',
            currency: input.currency?.toUpperCase() ?? 'USD',
            managerMembershipId: input.managerMembershipId ?? tenant.membershipId,
            plannedStartDate: input.plannedStartDate ? new Date(input.plannedStartDate) : undefined,
            plannedFinishDate: input.plannedFinishDate ? new Date(input.plannedFinishDate) : undefined,
          },
          select: {
            id: true,
            code: true,
            name: true,
            lifecycleStatus: true,
            priority: true,
            health: true,
            currency: true,
            plannedStartDate: true,
            plannedFinishDate: true,
            managerMembershipId: true,
            version: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ code: 'PROJECT_CODE_EXISTS', message: 'Project code already exists' });
      }
      throw error;
    }
  }
}
