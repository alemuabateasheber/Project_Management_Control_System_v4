import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async health(): Promise<{ status: 'ok'; checks: { database: 'ok' }; time: string }> {
    await this.healthService.assertDatabase();
    return { status: 'ok', checks: { database: 'ok' }, time: new Date().toISOString() };
  }

  @Get('live')
  live(): { status: 'ok'; time: string } {
    return { status: 'ok', time: new Date().toISOString() };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ready'; checks: { database: 'ok' } }> {
    try {
      await this.healthService.assertDatabase();
      return { status: 'ready', checks: { database: 'ok' } };
    } catch {
      throw new ServiceUnavailableException({
        code: 'SERVICE_NOT_READY',
        message: 'Database is not ready',
      });
    }
  }
}
