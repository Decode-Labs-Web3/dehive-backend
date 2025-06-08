import { NestFactory } from '@nestjs/core';
import { UserDehiveServerModule } from './user-dehive-server.module';

async function bootstrap() {
  const app = await NestFactory.create(UserDehiveServerModule);

    // Enable CORS for the UserDehiveServer service
    app.enableCors({
        origin: ['http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

  app.setGlobalPrefix('api');
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  console.log(`UserDehiveServer service is running on: http://localhost:${port}/api`);
}
bootstrap();