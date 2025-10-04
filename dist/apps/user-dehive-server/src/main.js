"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const user_dehive_server_module_1 = require("./user-dehive-server.module");
const transform_interface_1 = require("../interfaces/transform.interface");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(user_dehive_server_module_1.UserDehiveServerModule);
    const configService = app.get(config_1.ConfigService);
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
    }));
    app.useGlobalInterceptors(new transform_interface_1.TransformInterceptor());
    app.setGlobalPrefix('api');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Dehive - Membership Service')
        .setDescription('API documentation for managing user memberships, invites, roles, and profiles.')
        .setVersion('1.0')
        .addTag('memberships')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-docs', app, document);
    const port = configService.get('USER_DEHIVE_SERVER_PORT') || 4001;
    await app.listen(port, 'localhost');
    console.log(`[Dehive] User-Dehive-Server service is running on: ${await app.getUrl()}`);
    console.log(`[Dehive] Swagger UI available at: http://localhost:${port}/api-docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map