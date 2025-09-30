import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';

// Interfaces Import
import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface';
import { AuthServiceResponse } from '../../interfaces/auth-service-response.interface';
import { SessionCacheDoc } from '../../interfaces/session-doc.interface';

// Infrastructure Services
import { RedisInfrastructure } from '../../infrastructure/redis.infrastructure';
import { DecodeApiClient } from '../../infrastructure/external-services/decode-api.client';

// Decorators for role-based access
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
export const PUBLIC_KEY = 'public';

export const Roles = (...roles: ('user' | 'admin' | 'moderator')[]) =>
  SetMetadata(ROLES_KEY, roles);

export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const Public = () => SetMetadata(PUBLIC_KEY, true);

@Injectable()
export class DecodeAuthGuard implements CanActivate {
  private readonly logger = new Logger(DecodeAuthGuard.name);
  private readonly authServiceUrl: string;
  private readonly cache = new Map<
    string,
    { user: AuthenticatedUser; expiresAt: number }
  >();
  private readonly cacheTtl = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly redis: RedisInfrastructure,
    private readonly decodeApiClient: DecodeApiClient,
  ) {
    this.authServiceUrl =
      this.configService.get<string>('services.decode_auth.url') ||
      'http://localhost:4001';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>(
      PUBLIC_KEY,
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }

    // Extract session_id from request headers
    const sessionId = this.extractSessionIdFromHeader(request);
    if (!sessionId) {
      throw new UnauthorizedException({
        message: 'Session ID is required',
        error: 'MISSING_SESSION_ID',
      });
    }

    try {
      // Validate session and get user info
      const user = await this.validateSession(sessionId);

      // Check role-based access
      this.checkRoleAccess(context, user);

      // Attach user to request for use in controllers
      request['user'] = user;

      // Log successful authentication
      this.logger.log(
        `User ${user.userId} (${user.role}) accessed ${request.method} ${request.url}`,
      );

      return true;
    } catch (error) {
      // If it's already a NestJS exception, re-throw it
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
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

  private async validateSession(sessionId: string): Promise<AuthenticatedUser> {
    // Check cache first
    const cached = this.cache.get(sessionId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }

    // Get session data from Redis
    const sessionData = await this.getSessionFromRedis(sessionId);
    if (!sessionData) {
      throw new UnauthorizedException({
        message: 'Session not found or expired',
        error: 'SESSION_NOT_FOUND',
      });
    }

    // If we have cached user data, validate the access token first
    if (sessionData.user) {
      try {
        // Validate access token with Decode API
        await this.validateAccessToken(sessionData.access_token);

        // Cache the result
        this.cache.set(sessionId, {
          user: sessionData.user,
          expiresAt: Date.now() + this.cacheTtl,
        });

        return sessionData.user;
      } catch (error) {
        // If token validation fails, try to refresh
        if (
          (error instanceof UnauthorizedException &&
            error.message.includes('expired')) ||
          (error instanceof Error && error.message.includes('TOKEN_EXPIRED'))
        ) {
          this.logger.log(
            `Access token expired for session ${sessionId}, attempting refresh`,
          );

          try {
            // Attempt to refresh the session
            await this.refreshSession(sessionId);

            // Get updated session data
            const updatedSessionData =
              await this.getSessionFromRedis(sessionId);
            if (!updatedSessionData || !updatedSessionData.user) {
              throw new UnauthorizedException({
                message: 'Session refresh failed',
                error: 'REFRESH_FAILED',
              });
            }

            // Cache the result
            this.cache.set(sessionId, {
              user: updatedSessionData.user,
              expiresAt: Date.now() + this.cacheTtl,
            });

            return updatedSessionData.user;
          } catch (refreshError) {
            this.logger.error(
              `Session refresh failed for ${sessionId}: ${refreshError}`,
            );
            throw new UnauthorizedException({
              message: 'Session refresh failed',
              error: 'REFRESH_FAILED',
            });
          }
        }
        throw error;
      }
    }

    // Fallback: validate access token and get user data
    const user = await this.validateAccessToken(sessionData.access_token);

    // Cache the result
    this.cache.set(sessionId, {
      user,
      expiresAt: Date.now() + this.cacheTtl,
    });

    return user;
  }

  private async getSessionFromRedis(
    sessionId: string,
  ): Promise<SessionCacheDoc | null> {
    try {
      const sessionKey = `session:${sessionId}`;
      const sessionData: unknown = await this.redis.get(sessionKey);
      return (sessionData as SessionCacheDoc) || null;
    } catch (error) {
      this.logger.error(`Failed to retrieve session from Redis: ${error}`);
      return null;
    }
  }

  private async validateAccessToken(
    accessToken: string,
  ): Promise<AuthenticatedUser> {
    try {
      // Call auth service to validate token
      const response = await firstValueFrom(
        this.httpService.post<AuthServiceResponse>(
          `${this.authServiceUrl}/auth/info/by-access-token`,
          { access_token: accessToken },
          {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'User-Service/1.0',
            },
            timeout: 5000, // 5 second timeout
          },
        ),
      );

      if (!response.data.success || !response.data.data) {
        throw new UnauthorizedException({
          message: 'Invalid access token',
          error: 'INVALID_TOKEN',
        });
      }

      const userData = response.data.data;
      const user: AuthenticatedUser = {
        userId: userData._id,
        email: userData.email,
        username: userData.username,
        role: userData.role as 'user' | 'admin' | 'moderator',
      };

      return user;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        throw new UnauthorizedException({
          message: 'Invalid or expired access token',
          error: 'TOKEN_EXPIRED',
        });
      }

      if (error instanceof AxiosError) {
        this.logger.error('Auth service is unavailable');
        throw new UnauthorizedException({
          message: 'Authentication service unavailable',
          error: 'SERVICE_UNAVAILABLE',
        });
      }
      throw new UnauthorizedException({
        message: 'Token validation failed',
        error: 'VALIDATION_ERROR',
      });
    }
  }

  private async refreshSession(sessionId: string): Promise<void> {
    try {
      const sessionKey = `session:${sessionId}`;
      const sessionData = (await this.redis.get(sessionKey)) as SessionCacheDoc;

      if (!sessionData) {
        throw new Error('Session data not found');
      }

      // Call Decode API to refresh the session
      const refreshResponse = await this.decodeApiClient.refreshDecodeSession(
        sessionData.session_token,
      );

      if (!refreshResponse.success || !refreshResponse.data) {
        throw new Error('Failed to refresh session');
      }

      // Get fresh user data from Decode API
      const userResponse = await this.decodeApiClient.getUser(
        sessionData.user.userId,
        sessionId,
        '', // fingerprint_hashed - empty for now
      );

      if (!userResponse.success || !userResponse.data) {
        throw new Error('Failed to get updated user data');
      }

      const userData = userResponse.data;
      const updatedUser: AuthenticatedUser = {
        userId: userData._id,
        email: userData.email,
        username: userData.username,
        role: userData.role as 'user' | 'admin' | 'moderator',
      };

      // Update Redis with new session data and fresh user data
      const newSessionData = refreshResponse.data;
      const updatedSessionData: SessionCacheDoc = {
        session_token: newSessionData.session_token,
        access_token: newSessionData.access_token,
        user: updatedUser,
        expires_at: newSessionData.expires_at,
      };

      const expiresCountdown = Math.floor(
        (newSessionData.expires_at.getTime() - Date.now()) / 1000,
      );

      await this.redis.set(sessionKey, updatedSessionData, expiresCountdown);

      this.logger.log(
        `Session ${sessionId} refreshed successfully with updated user data`,
      );
    } catch (error) {
      this.logger.error(`Failed to refresh session ${sessionId}: ${error}`);
      throw error;
    }
  }

  private checkRoleAccess(
    context: ExecutionContext,
    user: AuthenticatedUser,
  ): void {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return; // No role requirements
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        message: `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user.role}`,
        error: 'INSUFFICIENT_PERMISSIONS',
      });
    }
  }

  // Utility method to clear cache (useful for testing or manual cache invalidation)
  clearCache(): void {
    this.cache.clear();
  }

  // Utility method to get cache size (useful for monitoring)
  getCacheSize(): number {
    return this.cache.size;
  }
}
