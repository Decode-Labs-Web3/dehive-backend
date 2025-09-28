import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

async function bootstrap() {
  // Create the NestJS application instance with the AuthModule
  // The AuthModule contains all the necessary providers, controllers, and configurations
  const app = await NestFactory.create(AuthModule);
  // Configure global exception filters for consistent error handling across the application
  // These filters ensure that all errors are formatted consistently and logged appropriately
  app.useGlobalFilters(
    new ValidationExceptionFilter(), // Handles validation errors with detailed field information
    new HttpExceptionFilter(), // Handles HTTP exceptions and external service errors
  );

  // Configure global validation pipe for automatic request validation
  // This ensures all incoming requests are validated against their respective DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties that don't have validation decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Transform payloads to be objects typed according to their DTO classes
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion for better DX
      },
    }),
  );

  // Configure server host and port from environment variables
  // Default values ensure the service can run in various environments
  const port = process.env.AUTH_PORT ?? 4006;
  const host = process.env.AUTH_HOST ?? 'localhost';

  // Start the server and listen for incoming requests
  await app.listen(port, host);

  // Log successful startup with service information
  console.info(`[AuthService] Auth service is running on ${host}:${port}`);
}

/**
 * Start the authentication service with error handling
 *
 * If the service fails to start, it will log the error and exit with code 1
 * This ensures proper error reporting and prevents the service from running in an invalid state
 */
bootstrap().catch((error) => {
  console.error('Failed to start Auth service:', error);
  process.exit(1);
});
