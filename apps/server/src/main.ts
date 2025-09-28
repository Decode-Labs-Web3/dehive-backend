import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerModule } from './server.module';
import { TransformInterceptor } from '../interfaces/transform.interface';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(ServerModule);

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: 'http://localhost:4002',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('Dehive - Server Service')
    .setDescription(
      'API documentation for managing servers, categories, and channels.',
    )
    .setVersion('1.0')
    .addTag('servers')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [ServerModule],
  });
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get<number>('SERVER_PORT') || 4002;
  await app.listen(port, 'localhost');
  console.log(`[Dehive] Server service is running on: ${await app.getUrl()}`);
  console.log(
    `[Dehive] Swagger UI available at: http://localhost:${port}/api-docs`,
  );
}
bootstrap();
