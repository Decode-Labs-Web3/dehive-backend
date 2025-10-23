import { NestFactory } from "@nestjs/core";
import { TestAuthModule } from "./test-auth.module";

async function bootstrap() {
  const app = await NestFactory.create(TestAuthModule);
  console.log("Starting Test Auth service on port 3000");
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
