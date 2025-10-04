"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const direct_messaging_module_1 = require("./direct-messaging.module");
const express = require("express");
const path = require("path");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
async function bootstrap() {
    const app = await core_1.NestFactory.create(direct_messaging_module_1.DirectMessagingModule);
    const configService = app.get(config_1.ConfigService);
    app.enableCors({ origin: '*' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Dehive - Direct Messaging Service')
        .setDescription('REST for 1:1 direct chat.')
        .setVersion('1.0')
        .addTag('Direct Messages')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-dm-docs', app, document);
    const port = configService.get('DIRECT_MESSAGING_PORT') || 4004;
    await app.listen(port);
    console.log(`[Dehive] Direct-Messaging service running at http://localhost:${port}`);
    console.log(`[Dehive] Swagger UI at http://localhost:${port}/api-dm-docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map