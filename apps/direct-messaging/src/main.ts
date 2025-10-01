import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DirectMessagingModule } from './direct-messaging.module';
import * as express from 'express';
import * as path from 'path';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(DirectMessagingModule);
  const configService = app.get(ConfigService);

  app.enableCors({ origin: '*' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('Dehive - Direct Messaging Service')
    .setDescription('REST for 1:1 direct chat.')
    .setVersion('1.0')
    .addTag('Direct Messages')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-dm-docs', app, document);

  const port = configService.get<number>('DIRECT_MESSAGING_PORT') || 4004;
  await app.listen(port);
  console.log(
    `[Dehive] Direct-Messaging service running at http://localhost:${port}`,
  );
  console.log(`[Dehive] Swagger UI at http://localhost:${port}/api-dm-docs`);
}
void bootstrap();
