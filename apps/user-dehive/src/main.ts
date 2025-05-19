import { NestFactory } from '@nestjs/core';
import { UserDehiveModule } from './user-dehive.module';

async function bootstrap() {
  const app = await NestFactory.create(UserDehiveModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
