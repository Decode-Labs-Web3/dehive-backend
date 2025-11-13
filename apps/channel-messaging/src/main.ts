import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { MessagingModule } from "./channel-messaging.module";
import { IoAdapter } from "@nestjs/platform-socket.io";
import * as express from "express";
import * as path from "path";

async function bootstrap() {
  const app = await NestFactory.create(MessagingModule);
  const configService = app.get(ConfigService);

  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "https://decodenetwork.app",
      "https://www.decodenetwork.app",
      "https://api.decodenetwork.app",
      "https://ws-channel-msg.api.decodenetwork.app",
    ],
    credentials: true,
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const logger = new Logger("ChannelMessagingMain");
  // Temporary request logger to help debug search endpoint issues
  app.use((req, _res, next) => {
    // Log method, path, query and key headers for debugging
    logger.debug(
      `[REQ] ${req.method} ${req.originalUrl} query=${JSON.stringify(req.query)} headers={x-session-id:${req.headers["x-session-id"]}, x-fingerprint-hash:${req.headers["x-fingerprint-hash"]}, x-fingerprint-hashed:${req.headers["x-fingerprint-hashed"]}}`,
    );
    next();
  });
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  const config = new DocumentBuilder()
    .setTitle("Dehive - Channel Messaging Service")
    .setDescription(
      "API and WebSocket documentation for real-time channel chat.",
    )
    .setVersion("1.0")
    .addTag("Channel Messages")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);

  const port = configService.get<number>("CHANNEL_MESSAGING_PORT") || 4003;
  const host = configService.get<string>("CLOUD_HOST") || "localhost";
  await app.listen(port, host);

  logger.log(
    `[Dehive] Channel-Messaging service is running on: ${await app.getUrl()}`,
  );
  logger.log(
    `[Dehive] Swagger UI available at: http://localhost:${port}/api-docs`,
  );
}
void bootstrap();
