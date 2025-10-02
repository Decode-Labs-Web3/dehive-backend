import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

export interface UserProfile {
  _id: string;
  username: string;
  display_name?: string;
  email: string;
  avatar?: string;
  bio?: string;
  created_at?: Date;
}

/**
 * Client to fetch user profiles from Auth Service with Redis caching
 */
@Injectable()
export class AuthServiceClient {
  private readonly logger = new Logger(AuthServiceClient.name);
  private readonly authServiceUrl: string;
  private readonly PROFILE_CACHE_TTL = 900; // 15 minutes
  private readonly PROFILE_CACHE_PREFIX = 'user_profile:';

  constructor(
    private readonly httpService: HttpService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl =
      this.configService.get<string>('AUTH_SERVICE_URL') ||
      'http://localhost:4006';
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await firstValueFrom(
        this.httpService.get<{
          success: boolean;
          data: UserProfile;
          message?: string;
        }>(`${this.authServiceUrl}/auth/profile/${userId}`, {
          timeout: 5000,
        }),
      );

      if (!response.data.success || !response.data.data) {
        return null;
      }

      const profile = response.data.data;
      await this.redis.setex(
        cacheKey,
        this.PROFILE_CACHE_TTL,
        JSON.stringify(profile),
      );

      return profile;
    } catch (error) {
      this.logger.error(`Failed to fetch user profile: ${userId}`);
      return null;
    }
  }

  async batchGetProfiles(
    userIds: string[],
  ): Promise<Record<string, UserProfile>> {
    if (!userIds || userIds.length === 0) {
      return {};
    }

    const uniqueIds = [...new Set(userIds)];
    const pipeline = this.redis.pipeline();
    uniqueIds.forEach((id) => {
      pipeline.get(`${this.PROFILE_CACHE_PREFIX}${id}`);
    });

    const cachedResults = await pipeline.exec();
    const profiles: Record<string, UserProfile> = {};
    const missingIds: string[] = [];

    uniqueIds.forEach((id, idx) => {
      if (cachedResults && cachedResults[idx]) {
        const [err, data] = cachedResults[idx];
        if (!err && data) {
          try {
            profiles[id] = JSON.parse(data as string);
          } catch (parseError) {
            missingIds.push(id);
          }
        } else {
          missingIds.push(id);
        }
      } else {
        missingIds.push(id);
      }
    });

    if (missingIds.length > 0) {
      const fetchPromises = missingIds.map((id) =>
        this.getUserProfile(id).then((profile) => ({ id, profile })),
      );

      const results = await Promise.all(fetchPromises);

      results.forEach(({ id, profile }) => {
        if (profile) {
          profiles[id] = profile;
        }
      });
    }

    return profiles;
  }
}
