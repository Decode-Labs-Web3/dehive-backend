import { NestFactory } from '@nestjs/core';
import { EmailWorkerModule } from './email-worker.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    EmailWorkerModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [configService.get('RABBITMQ_URI') as string],
        queue: 'email.send',
        queueOptions: { durable: false },
      },
    },
  );
  await app.listen();
}
bootstrap();
