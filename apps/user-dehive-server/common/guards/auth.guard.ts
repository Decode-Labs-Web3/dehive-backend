// THAY THẾ TOÀN BỘ FILE: src/guards/auth.guard.ts
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
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { SessionCacheDoc, SessionDoc } from '../../interfaces/session-doc.interface';
import { UserProfile } from '../../interfaces/user-profile.interface';
import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface';

export const PUBLIC_KEY = 'public';
export const Public = () => SetMetadata(PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    const host = this.configService.get<string>('DECODE_API_GATEWAY_HOST');
    const port = this.configService.get<number>('DECODE_API_GATEWAY_PORT');
    if (!host || !port) {
      throw new Error('DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!');
    }
    this.authServiceUrl = `http://${host}:${port}`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(PUBLIC_KEY, context.getHandler());
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.headers['x-session-id'] as string | undefined;

    if (!sessionId) {
      throw new UnauthorizedException('Session ID is required');
    }

    try {
      const sessionKey = `session:${sessionId}`;
      const cachedSessionRaw = await this.redis.get(sessionKey);
      if (cachedSessionRaw) {
        const cachedSession: SessionCacheDoc = JSON.parse(cachedSessionRaw);
        if (cachedSession.user) {
          const authenticatedUser: AuthenticatedUser = { ...cachedSession.user, session_id: sessionId };
          request['user'] = authenticatedUser;
          return true;
        }
      }

      const response = await firstValueFrom(
        this.httpService.get<{ data: SessionDoc }>(`${this.authServiceUrl}/auth/sso/validate`, {
          headers: { 'x-session-id': sessionId },
        }),
      );

      const sessionData = response.data.data;
      if (!sessionData || !sessionData.access_token) {
        throw new UnauthorizedException('Invalid session data from auth service');
      }

      const profileResponse = await firstValueFrom(
        this.httpService.get<{ data: UserProfile }>(`${this.authServiceUrl}/users/profile/me`, {
          headers: { 'Authorization': `Bearer ${sessionData.access_token}` },
        }),
      );

      const userProfile = profileResponse.data.data;
      if (!userProfile) {
        throw new UnauthorizedException('Could not retrieve user profile');
      }

      const cacheData: SessionCacheDoc = {
        session_token: sessionData.session_token,
        access_token: sessionData.access_token,
        user: userProfile,
        expires_at: sessionData.expires_at,
      };
      const ttl = Math.ceil((new Date(sessionData.expires_at).getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await this.redis.set(sessionKey, JSON.stringify(cacheData), 'EX', ttl);
      }

      const authenticatedUser: AuthenticatedUser = { ...userProfile, session_id: sessionId };
      request['user'] = authenticatedUser;
      return true;

    } catch (error) {
      this.logger.error(`Authentication failed for session ${sessionId}:`, error.stack);
      throw new UnauthorizedException('Authentication failed or invalid session');
    }
  }
}
