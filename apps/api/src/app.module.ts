import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SentoresModule } from './modules/sentores/sentores.module';

@Module({
  imports: [PrismaModule, AuthModule, HealthModule, SentoresModule],
})
export class AppModule {}
