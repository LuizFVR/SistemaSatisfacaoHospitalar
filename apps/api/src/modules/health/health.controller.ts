import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<{
    status: 'ok' | 'degraded';
    database: 'up' | 'down';
    timestamp: string;
  }> {
    return this.healthService.getHealth();
  }
}
