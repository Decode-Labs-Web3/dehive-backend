import { NestFactory } from "@nestjs/core";
import { UserStatusModule } from "./user-status.module";
import { Logger, ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(UserStatusModule);
  const port = 4008;

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "https://decodenetwork.app",
      "https://www.decodenetwork.app",
      "https://api.decodenetwork.app",
      "https://ws-status.api.decodenetwork.app",
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);

  Logger.log(
    `[Dehive] User-Status service running at http://localhost:${port}`,
  );
  Logger.log(`[Dehive] WebSocket namespace: /status`);
}
bootstrap();
