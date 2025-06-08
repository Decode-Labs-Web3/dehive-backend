import { Module } from '@nestjs/common';
import { EmailWorkerController } from './email-worker.controller';
import { EmailWorkerService } from './email-worker.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [EmailWorkerController],
  providers: [EmailWorkerService],
})
export class EmailWorkerModule {}
