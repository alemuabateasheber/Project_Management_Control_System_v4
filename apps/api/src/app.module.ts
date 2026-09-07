import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { AuthModule } from './auth/auth.module';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [PrismaModule, AuthModule, HealthModule, ProjectsModule, FinanceModule],
})
export class AppModule {}
