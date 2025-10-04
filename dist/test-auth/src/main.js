"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const test_auth_module_1 = require("./test-auth.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(test_auth_module_1.TestAuthModule);
    console.log('Starting Test Auth service on port 3000');
    await app.listen(process.env.port ?? 3000);
}
bootstrap();
//# sourceMappingURL=main.js.map