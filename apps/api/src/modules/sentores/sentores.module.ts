import { Module } from '@nestjs/common';
import { SentoresController } from './sentores.controller';
import { SentoresService } from './sentores.service';

@Module({
  controllers: [SentoresController],
  providers: [SentoresService],
})
export class SentoresModule {}
