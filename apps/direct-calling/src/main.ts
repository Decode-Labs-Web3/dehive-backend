import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { DirectCallModule } from "./direct-call.module";
import * as express from "express";
import * as path from "path";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { MethodNotAllowedFilter } from "../common/filters/method-not-allowed.filter";

async function bootstrap() {
  const app = await NestFactory.create(DirectCallModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "https://decodenetwork.app",
      "https://www.decodenetwork.app",
      "https://api.decodenetwork.app",
      "https://ws-dc.api.decodenetwork.app",
    ],
    credentials: true,
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new MethodNotAllowedFilter());
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle("Dehive - Direct Calling Service")
    .setDescription("REST API for 1:1 video/audio calls with WebRTC signaling")
    .setVersion("1.0")
    .addTag("Direct Calls")
    .addTag("TURN/ICE Configuration")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-dc-docs", app, document);

  const port = configService.get<number>("DIRECT_CALLING_PORT") || 4005;
  const host = configService.get<string>("CLOUD_HOST") || "localhost";
  await app.listen(port, host);
  console.log(
    `[Dehive] Direct-Calling service running at http://localhost:${port}`,
  );
  console.log(`[Dehive] Swagger UI at http://localhost:${port}/api-dc-docs`);
  console.log(`[Dehive] WebSocket namespace: /rtc`);
}
void bootstrap();
