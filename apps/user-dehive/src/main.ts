import { NestFactory } from '@nestjs/core';
import { UserDehiveModule } from '../src/user-dehive.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(UserDehiveModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  app.enableCors();

  await app.listen(3001);
  console.log(`🚀 User-Dehive service is running on http://localhost:3001`);
}
bootstrap();
