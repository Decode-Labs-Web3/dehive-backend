import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { body } = request;

    if (body && typeof body === 'object') {
      // Validate MongoDB ObjectIds
      for (const key in body) {
        // Kiểm tra các trường ID
        if ((key.endsWith('_id') || key === 'id') && typeof body[key] === 'string') {
          if (!/^[0-9a-fA-F]{24}$/.test(body[key])) {
            throw new Error(`${key} must be a valid MongoDB ObjectId`);
          }
        }

        // Kiểm tra các trường không được để trống
        if (key.includes('name') && (!body[key] || body[key].trim() === '')) {
          throw new Error(`${key} cannot be empty`);
        }

        // Kiểm tra định dạng email
        if (key.includes('email') && typeof body[key] === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(body[key])) {
            throw new Error(`${key} must be a valid email address`);
          }
        }

        // Kiểm tra độ dài của string
        if (typeof body[key] === 'string' && key.includes('description')) {
          if (body[key].length > 1000) {
            throw new Error(`${key} must not exceed 1000 characters`);
          }
        }
      }
    }

    return next.handle();
  }
}
