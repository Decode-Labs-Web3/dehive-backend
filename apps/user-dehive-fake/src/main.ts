import { NestFactory } from '@nestjs/core';
import { UserDehiveModule } from './user-dehive.module';

async function bootstrap() {
  const app = await NestFactory.create(UserDehiveModule);
  const port = process.env.USER_DEHIVE_PORT ?? 5001;
  await app.listen(port);
  console.log(`User Dehive is running on: http://localhost:${port}`);
}
bootstrap();
