import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerModule } from './server.module';

async function bootstrap() {
  const app = await NestFactory.create(ServerModule);

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: 'http://localhost:4002', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true, 
    }),
  );

  const port = configService.get<number>('SERVER_PORT') || 4002;
  await app.listen(port, 'localhost'); 
  console.log(`[Dehive] Server service is running on: ${await app.getUrl()}`);
}

bootstrap();