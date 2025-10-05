"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule, {
            logger: ['error', 'warn', 'log', 'debug', 'verbose'],
        });
        app.enableCors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        });
        app.useGlobalPipes(new common_1.ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }));
        const config = new swagger_1.DocumentBuilder()
            .setTitle('Dehive API Gateway')
            .setDescription(`
        Central API Gateway for all Dehive services.

        This gateway routes requests to the appropriate microservices:
        - **Auth Service**: Authentication and user management
        - **Server Service**: Server and channel management
        - **User-Dehive-Server**: User profiles and memberships
        - **Channel Messaging**: Channel-based messaging
        - **Direct Messaging**: Direct user-to-user messaging

        All requests are automatically routed to the correct service based on the URL path.
      `)
            .setVersion('1.0.0')
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
        }, 'JWT-auth')
            .addTag('Gateway', 'API Gateway endpoints')
            .addTag('Health', 'Health check endpoints')
            .addServer('http://localhost:3000', 'Development server')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
            },
        });
        app.enableShutdownHooks();
        const port = process.env.PORT || 3000;
        await app.listen(port);
        logger.log(`🚀 API Gateway running on: http://localhost:${port}`);
        logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
        logger.log(`🏥 Health Check: http://localhost:${port}/health`);
        logger.log(`🔧 Services Status: http://localhost:${port}/services`);
        logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.log(`CORS Origins: ${process.env.ALLOWED_ORIGINS || 'default'}`);
    }
    catch (error) {
        logger.error('Failed to start API Gateway:', error);
        process.exit(1);
    }
}
bootstrap().catch((error) => {
    console.error('Bootstrap failed:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map