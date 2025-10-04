"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const channel_messaging_module_1 = require("./channel-messaging.module");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const express = require("express");
const path = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(channel_messaging_module_1.MessagingModule);
    const configService = app.get(config_1.ConfigService);
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    app.enableCors({ origin: '*' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Dehive - Channel Messaging Service')
        .setDescription('API and WebSocket documentation for real-time channel chat.')
        .setVersion('1.0')
        .addTag('Channel Messages')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-docs', app, document);
    const port = configService.get('CHANNEL_MESSAGING_PORT') || 4003;
    await app.listen(port, 'localhost');
    console.log(`[Dehive] Channel-Messaging service is running on: ${await app.getUrl()}`);
    console.log(`[Dehive] Swagger UI available at: http://localhost:${port}/api-docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map