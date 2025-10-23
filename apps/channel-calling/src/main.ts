import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ChannelCallModule } from "./channel-call.module";
import * as express from "express";
import * as path from "path";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { MethodNotAllowedFilter } from "../common/filters/method-not-allowed.filter";

async function bootstrap() {
  const app = await NestFactory.create(ChannelCallModule);
  const configService = app.get(ConfigService);

  app.enableCors({ origin: "*" });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new MethodNotAllowedFilter());
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle("Dehive - Channel Calling Service")
    .setDescription(
      "REST API for voice channel calls (multiple participants) with WebRTC signaling",
    )
    .setVersion("1.0")
    .addTag("Channel Calls")
    .addTag("TURN/ICE Configuration")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-cc-docs", app, document);

  const port = configService.get<number>("CHANNEL_CALLING_PORT") || 4007;
  const host = configService.get<string>("CLOUD_HOST") || "localhost";
  await app.listen(port, host);
  console.log(
    `[Dehive] Channel-Calling service running at http://localhost:${port}`,
  );
  console.log(`[Dehive] Swagger UI at http://localhost:${port}/api-cc-docs`);
  console.log(`[Dehive] WebSocket namespace: /channel-rtc`);
}
void bootstrap();
