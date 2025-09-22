import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserDehiveServerModule } from './user-dehive-server.module';
import { TransformInterceptor } from '../interfaces/transform.interface';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(UserDehiveServerModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Dehive - Membership Service')
    .setDescription(
      'API documentation for managing user memberships, invites, roles, and profiles.',
    )
    .setVersion('1.0')
    .addTag('memberships')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get<number>('USER_DEHIVE_SERVER_PORT') || 4001;
  await app.listen(port, 'localhost');

  console.log(
    `[Dehive] User-Dehive-Server service is running on: ${await app.getUrl()}`,
  );
  console.log(
    `[Dehive] Swagger UI available at: http://localhost:${port}/api-docs`,
  );
}
bootstrap();
