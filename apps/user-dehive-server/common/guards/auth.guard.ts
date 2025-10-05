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
            // Use ONLY basic user info from JWT (no need to call auth service)
            console.log('🔍 [USER-DEHIVE AUTH GUARD] Fetching full user profile from decode service');

            // Fetch full user profile from decode service
            try {
              const profileResponse = await firstValueFrom(
                this.httpService.get<{
                  success: boolean;
                  data: any;
                  message?: string;
                }>(`http://localhost:4006/auth/profile/${userId}`, {
                  headers: {
                    'x-session-id': sessionId,
                    'Content-Type': 'application/json',
                  },
                  timeout: 5000,
                }),
              );

              console.log('🔍 [USER-DEHIVE AUTH GUARD] Profile response:', profileResponse.data);
              console.log('🔍 [USER-DEHIVE AUTH GUARD] Profile data structure:', JSON.stringify(profileResponse.data, null, 2));

              if (profileResponse.data.success && profileResponse.data.data) {
                const userProfile = profileResponse.data.data;
                console.log('🔍 [USER-DEHIVE AUTH GUARD] User profile fields:', Object.keys(userProfile));
                console.log('🔍 [USER-DEHIVE AUTH GUARD] User profile values:', JSON.stringify(userProfile, null, 2));
                 // Use email from userProfile directly (same as username and display_name)
                 const realEmail = userProfile.email;
                 console.log('🔍 [USER-DEHIVE AUTH GUARD] userProfile.email:', realEmail);
                 console.log('🔍 [USER-DEHIVE AUTH GUARD] userProfile.username:', userProfile.username);
                 console.log('🔍 [USER-DEHIVE AUTH GUARD] userProfile.display_name:', userProfile.display_name);
                 console.log('🔍 [USER-DEHIVE AUTH GUARD] All userProfile keys:', Object.keys(userProfile));
                 console.log('🔍 [USER-DEHIVE AUTH GUARD] Full userProfile:', JSON.stringify(userProfile, null, 2));

                 request['user'] = {
                   _id: userId,
                   userId: userId,
                   email: realEmail,
                   username: userProfile.username,
                   display_name: userProfile.display_name,
                   avatar: userProfile.avatar_ipfs_hash,
                   role: 'user' as const,
                 };
                console.log('✅ [USER-DEHIVE AUTH GUARD] Full user profile loaded:', request['user']);
              } else {
                throw new Error('Failed to fetch user profile');
              }
            } catch (profileError) {
              console.log('❌ [USER-DEHIVE AUTH GUARD] Failed to fetch profile, using basic info:', profileError.message);
              request['user'] = {
                _id: userId,
                userId: userId,
                email: 'user@example.com',
                username: 'user',
                display_name: 'user',
                avatar: null,
                role: 'user' as const,
              };
            }

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
}
