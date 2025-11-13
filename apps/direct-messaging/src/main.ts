import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { DirectMessagingModule } from "./direct-messaging.module";
import * as express from "express";
import * as path from "path";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { MethodNotAllowedFilter } from "../common/filters/method-not-allowed.filter";

async function bootstrap() {
  const app = await NestFactory.create(DirectMessagingModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "https://decodenetwork.app",
      "https://www.decodenetwork.app",
      "https://api.decodenetwork.app",
      "https://ws-dm.api.decodenetwork.app",
    ],
    credentials: true,
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new MethodNotAllowedFilter());
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle("Dehive - Direct Messaging Service")
    .setDescription("REST for 1:1 direct chat.")
    .setVersion("1.0")
    .addTag("Direct Messages")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-dm-docs", app, document);

  const port = configService.get<number>("DIRECT_MESSAGING_PORT") || 4004;
  const host = configService.get<string>("CLOUD_HOST") || "localhost";
  await app.listen(port, host);
  console.log(
    `[Dehive] Direct-Messaging service running at http://localhost:${port}`,
  );
  console.log(`[Dehive] Swagger UI at http://localhost:${port}/api-dm-docs`);
}
void bootstrap();
