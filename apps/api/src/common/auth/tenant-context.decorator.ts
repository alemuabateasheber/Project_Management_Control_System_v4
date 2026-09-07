import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { TenantContext } from '@pmcs/database';
import type { RequestWithId } from '../http/express';

export const TenantContextParam = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const tenant = request.pmcsUser;
    if (!tenant) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required',
      });
    }
    return {
      organizationId: tenant.organizationId,
      membershipId: tenant.membershipId,
    };
  },
);
