import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';

// Interfaces
import { Response } from '../../interfaces/response.interface';
import { SessionCacheDoc } from '../../interfaces/session-doc.interface';

// Decorators for public routes
export const PUBLIC_KEY = 'public';
export const Public = () => SetMetadata(PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly authServiceUrl = 'http://localhost:4006';

  constructor(private readonly httpService: HttpService) {
    console.log('🔥 [AUTH GUARD] Constructor called - AuthGuard initialized!');
    console.log('🔥 [AUTH GUARD] HttpService injected:', !!this.httpService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      console.log('🚨 [AUTH GUARD] canActivate called!');
      const request = context.switchToHttp().getRequest<Request>();
      console.log('🚨 [AUTH GUARD] Request headers:', request.headers);

      // Check if route is marked as public
      const isPublic = new Reflector().get<boolean>(
        PUBLIC_KEY,
        context.getHandler(),
      );
      console.log('🚨 [AUTH GUARD] isPublic:', isPublic);
      if (isPublic) {
        console.log('🚨 [AUTH GUARD] Route is public, skipping auth');
        return true;
      }

      // Extract session_id from request headers
      const sessionId = this.extractSessionIdFromHeader(request);
      console.log('🚨 [AUTH GUARD] sessionId extracted:', sessionId);
      if (!sessionId) {
        console.log('❌ [AUTH GUARD] No session ID found!');
        throw new UnauthorizedException({
          message: 'Session ID is required',
          error: 'MISSING_SESSION_ID',
        });
      }

      try {
        console.log('🚨 [AUTH GUARD] Calling auth service...');
        // Call auth service to validate session and get user data
        const response = await firstValueFrom(
          this.httpService.get<{
            success: boolean;
            data: SessionCacheDoc;
            message?: string;
          }>(`${this.authServiceUrl}/auth/session/check`, {
            headers: {
              'x-session-id': sessionId,
              'Content-Type': 'application/json',
            },
            timeout: 5000, // 5 second timeout
          }),
        );
        console.log('✅ [AUTH GUARD] Auth service response received');

        if (!response.data.success || !response.data.data) {
          throw new UnauthorizedException({
            message: response.data.message || 'Invalid session',
            error: 'INVALID_SESSION',
          });
        }

        // Attach user to request for use in controllers
        const session_check_response = response.data;
        if (session_check_response.success && session_check_response.data) {
          console.log(
            '🔍 [AUTH GUARD] session_check_response.data:',
            session_check_response.data,
          );
          console.log(
            '🔍 [AUTH GUARD] user._id:',
            session_check_response.data.user._id,
          );
          console.log(
            '🔍 [AUTH GUARD] user object:',
            session_check_response.data.user,
          );

          // Use _id from Auth service directly as userId for Dehive
          request['user'] = {
            userId: session_check_response.data.user._id,
            email: session_check_response.data.user.email || '',
            username: session_check_response.data.user.username || '',
            role: 'user' as const,
          };
          request['sessionId'] = sessionId;

          console.log('✅ [AUTH GUARD] request.user:', request['user']);
          console.log(
            '✅ [AUTH GUARD] request.sessionId:',
            request['sessionId'],
          );
          console.log(
            '✅ [AUTH GUARD] userId extracted:',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (request['user'] as any).userId,
          );
        }

        return true;
      } catch (error) {
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) {
            throw new UnauthorizedException({
              message: 'Invalid or expired session',
              error: 'SESSION_EXPIRED',
            });
          }

          this.logger.error('Auth service is unavailable');
          throw new UnauthorizedException({
            message: 'Authentication service unavailable',
            error: 'SERVICE_UNAVAILABLE',
          });
        }

        // If it's already a NestJS exception, re-throw it
        if (error instanceof UnauthorizedException) {
          throw error;
        }

        // Log the error for debugging
        this.logger.error(
          `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );

        // Convert unknown errors to UnauthorizedException
        throw new UnauthorizedException({
          message: 'Authentication failed',
          error: 'AUTHENTICATION_ERROR',
        });
      }
    } catch (outerError) {
      console.log('💥 [AUTH GUARD] Outer catch - Runtime error:', outerError);
      console.log('💥 [AUTH GUARD] Error type:', typeof outerError);
      console.log(
        '💥 [AUTH GUARD] Error message:',
        outerError instanceof Error ? outerError.message : String(outerError),
      );

      // If it's already an UnauthorizedException, re-throw it
      if (outerError instanceof UnauthorizedException) {
        throw outerError;
      }

      // Log and convert to UnauthorizedException
      this.logger.error('AuthGuard runtime error:', outerError);
      throw new UnauthorizedException({
        message: 'AuthGuard runtime error',
        error: 'GUARD_RUNTIME_ERROR',
      });
    }
  }

  private extractSessionIdFromHeader(request: Request): string | undefined {
    return request.headers['x-session-id'] as string | undefined;
  }
}
