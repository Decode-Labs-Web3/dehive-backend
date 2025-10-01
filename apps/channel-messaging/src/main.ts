import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MessagingModule } from './channel-messaging.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(MessagingModule);
  const configService = app.get(ConfigService);

  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({ origin: '*' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  const config = new DocumentBuilder()
    .setTitle('Dehive - Channel Messaging Service')
    .setDescription(
      'API and WebSocket documentation for real-time channel chat.',
    )
    .setVersion('1.0')
    .addTag('Channel Messages')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get<number>('CHANNEL_MESSAGING_PORT') || 4003;
  await app.listen(port, 'localhost');

  console.log(
    `[Dehive] Channel-Messaging service is running on: ${await app.getUrl()}`,
  );
  console.log(
    `[Dehive] Swagger UI available at: http://localhost:${port}/api-docs`,
  );
}
void bootstrap();
