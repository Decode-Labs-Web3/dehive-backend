import { NestFactory } from '@nestjs/core';
import { DehiveApiGatewayModule } from './dehive-api-gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(DehiveApiGatewayModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
