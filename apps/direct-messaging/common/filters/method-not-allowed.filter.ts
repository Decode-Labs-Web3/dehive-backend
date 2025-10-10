import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class MethodNotAllowedFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Check if it's a method not allowed error
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = exception.message;

      // Handle 405 Method Not Allowed
      if (status === HttpStatus.METHOD_NOT_ALLOWED) {
        const allowedMethods = this.getAllowedMethods(request.url);
        response.status(405).json({
          success: false,
          statusCode: 405,
          message: `Method ${request.method} not allowed for this endpoint. Allowed methods: ${allowedMethods.join(', ')}`,
          error: 'Method Not Allowed',
          path: request.url,
          method: request.method,
          allowedMethods,
        });
        return;
      }

      // Handle other HTTP exceptions
      response.status(status).json({
        success: false,
        statusCode: status,
        message: message,
        error: exception.constructor.name,
        path: request.url,
        method: request.method,
      });
      return;
    }

    // Handle unknown errors
    response.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
      path: request.url,
      method: request.method,
    });
  }

  private getAllowedMethods(url: string): string[] {
    // Define allowed methods for each endpoint
    const endpointMethods: Record<string, string[]> = {
      '/api/dm/send': ['POST'],
      '/api/dm/conversation': ['POST'],
      '/api/dm/messages': ['GET'],
      '/api/dm/files/upload': ['POST'],
      '/api/dm/files/list': ['GET'],
      '/api/dm/following': ['GET'],
    };

    // Find matching endpoint
    for (const [endpoint, methods] of Object.entries(endpointMethods)) {
      if (url.startsWith(endpoint)) {
        return methods;
      }
    }

    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  }
}
