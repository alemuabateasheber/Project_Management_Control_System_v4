import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import type { RequestWithId } from '../http/express';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    request.pmcsUser = await this.authService.authenticateRequest(request);
    return true;
  }
}
