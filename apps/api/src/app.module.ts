import { Module } from '@nestjs/common';
import { AlertasModule } from './modules/alertas/alertas.module';
import { AuthModule } from './modules/auth/auth.module';
import { FormulariosModule } from './modules/formularios/formularios.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';
import { SentoresModule } from './modules/sentores/sentores.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    SentoresModule,
    FormulariosModule,
    RelatoriosModule,
    AlertasModule,
  ],
})
export class AppModule {}
