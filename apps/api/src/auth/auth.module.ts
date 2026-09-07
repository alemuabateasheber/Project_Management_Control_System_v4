import { Global, Module } from '@nestjs/common';
import { TenantContextGuard } from '../common/auth/tenant-context.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, TenantContextGuard],
  exports: [AuthService, TenantContextGuard],
})
export class AuthModule {}
