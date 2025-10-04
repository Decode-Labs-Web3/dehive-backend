"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const auth_module_1 = require("./auth.module");
const common_1 = require("@nestjs/common");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const validation_exception_filter_1 = require("./common/filters/validation-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(auth_module_1.AuthModule);
    app.useGlobalFilters(new validation_exception_filter_1.ValidationExceptionFilter(), new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const port = process.env.AUTH_PORT ?? 4006;
    const host = process.env.AUTH_HOST ?? 'localhost';
    await app.listen(port, host);
    console.info(`[AuthService] Auth service is running on ${host}:${port}`);
}
bootstrap().catch((error) => {
    console.error('Failed to start Auth service:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map