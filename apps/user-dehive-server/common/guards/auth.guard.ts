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

  constructor(
    private readonly httpService: HttpService,
    private readonly reflector: Reflector,
  ) {
    console.log(
      '🔥 [USER-DEHIVE AUTH GUARD] Constructor called - This is the user-dehive-server AuthGuard!',
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log(
      '🚨 [USER-DEHIVE AUTH GUARD] canActivate called - This is the user-dehive-server AuthGuard!',
    );
    const request = context.switchToHttp().getRequest<Request>();

    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>(
      PUBLIC_KEY,
      context.getHandler(),
    );
    console.log('🚨 [USER-DEHIVE AUTH GUARD] isPublic:', isPublic);
    if (isPublic) {
      console.log('🚨 [USER-DEHIVE AUTH GUARD] Route is public, skipping auth');
      return true;
    }

    // Extract session_id from request headers
    const sessionId = this.extractSessionIdFromHeader(request);
    console.log('🚨 [USER-DEHIVE AUTH GUARD] sessionId:', sessionId);
    if (!sessionId) {
      console.log('❌ [USER-DEHIVE AUTH GUARD] No session ID found!');
      throw new UnauthorizedException({
        message: 'Session ID is required',
        error: 'MISSING_SESSION_ID',
      });
    }

    // Extract user_dehive_id from URL if available
    const userDehiveId = this.extractUserDehiveIdFromUrl(request);
    console.log('🚨 [USER-DEHIVE AUTH GUARD] userDehiveId from URL:', userDehiveId);

    try {
      // Call auth service to validate session and get user data
      console.log(
        '🔐 [USER-DEHIVE AUTH GUARD] Calling auth service for session validation',
      );

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

      if (!response.data.success || !response.data.data) {
        throw new UnauthorizedException({
          message: response.data.message || 'Invalid session',
          error: 'INVALID_SESSION',
        });
      }

      // Attach user to request for use in controllers
      const session_check_response = response.data;
      console.log(
        '🔍 [USER-DEHIVE AUTH GUARD] Session check response:',
        session_check_response,
      );
      if (session_check_response.success && session_check_response.data) {
        // Use session data directly - no need to call /auth/profile
        console.log('🔐 [USER-DEHIVE AUTH GUARD] Using session data directly');

        // Decode JWT token to get _id
        const sessionData = session_check_response.data;
        const sessionToken = sessionData.session_token;

        if (sessionToken) {
          console.log(
            '🔍 [USER-DEHIVE AUTH GUARD] Session token:',
            sessionToken,
          );

          // Decode JWT payload (base64 decode)
          const payload = sessionToken.split('.')[1];
          console.log('🔍 [USER-DEHIVE AUTH GUARD] JWT payload:', payload);

          const decodedPayload = JSON.parse(
            Buffer.from(payload, 'base64').toString(),
          );
          console.log(
            '🔍 [USER-DEHIVE AUTH GUARD] Decoded payload:',
            decodedPayload,
          );

          // Try different possible field names
          const userId =
            decodedPayload._id ||
            decodedPayload.user_id ||
            decodedPayload.sub ||
            decodedPayload.id;
          console.log('🔍 [USER-DEHIVE AUTH GUARD] User ID:', userId);
          console.log(
            '🔍 [USER-DEHIVE AUTH GUARD] Available fields in JWT:',
            Object.keys(decodedPayload),
          );

          if (userId) {
            // Use session data directly instead of calling profile endpoint
            console.log('🔍 [USER-DEHIVE AUTH GUARD] Using session data directly for user profile');

            // If userDehiveId is provided, use it instead of userId from session
            const targetUserId = userDehiveId || userId;
            console.log('🔍 [USER-DEHIVE AUTH GUARD] Using targetUserId:', targetUserId);
            console.log('🔍 [USER-DEHIVE AUTH GUARD] userDehiveId from URL:', userDehiveId);
            console.log('🔍 [USER-DEHIVE AUTH GUARD] userId from session:', userId);

            // Use session data directly - no need to call profile endpoint
            // This avoids the 401 error from auth service profile endpoint
            request['user'] = {
              _id: targetUserId,
              userId: targetUserId,
              email: '', // Will be filled by service if needed
              username: '', // Will be filled by service if needed
              display_name: '', // Will be filled by service if needed
              avatar: '', // Will be filled by service if needed
              role: 'user', // Default role
              session_id: sessionId, // Add session_id for service use
            };

            request['sessionId'] = sessionId;
            console.log(
              '✅ [USER-DEHIVE AUTH GUARD] User attached to request:',
              request['user'],
            );
          } else {
            throw new UnauthorizedException({
              message: 'No _id in JWT token',
              error: 'NO_ID_IN_JWT',
            });
          }
        } else {
          throw new UnauthorizedException({
            message: 'No session token available',
            error: 'NO_SESSION_TOKEN',
          });
        }
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
  }

  private extractSessionIdFromHeader(request: Request): string | undefined {
    return request.headers['x-session-id'] as string | undefined;
  }

  private extractUserDehiveIdFromUrl(request: Request): string | undefined {
    const url = request.url;
    console.log('🚨 [USER-DEHIVE AUTH GUARD] Full URL:', url);

    // Extract user_dehive_id from URL patterns like:
    // /api/memberships/profile/target/{user_dehive_id}
    // /api/memberships/profile/enriched/target/{user_dehive_id}
    const targetMatch = url.match(/\/profile\/target\/([^\/\?]+)/);
    const enrichedMatch = url.match(/\/profile\/enriched\/target\/([^\/\?]+)/);

    if (targetMatch) {
      console.log('🚨 [USER-DEHIVE AUTH GUARD] Found user_dehive_id from target route:', targetMatch[1]);
      return targetMatch[1];
    }

    if (enrichedMatch) {
      console.log('🚨 [USER-DEHIVE AUTH GUARD] Found user_dehive_id from enriched route:', enrichedMatch[1]);
      return enrichedMatch[1];
    }

    console.log('🚨 [USER-DEHIVE AUTH GUARD] No user_dehive_id found in URL');
    return undefined;
  }
}
