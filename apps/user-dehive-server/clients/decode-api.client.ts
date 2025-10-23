// TẠO FILE MỚI: src/clients/decode-api.client.ts
import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { UserProfile } from "../interfaces/user-profile.interface";
import { SessionCacheDoc } from "../interfaces/session-doc.interface";

@Injectable()
export class DecodeApiClient {
  private readonly logger = new Logger(DecodeApiClient.name);
  private readonly decodeApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    const host = this.configService.get<string>("DECODE_API_GATEWAY_HOST");
    const port = this.configService.get<number>("DECODE_API_GATEWAY_PORT");
    if (!host || !port) {
      throw new Error(
        "DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!",
      );
    }
    this.decodeApiUrl = `http://${host}:${port}`;
  }

  async getUserById(
    userId: string,
    sessionIdOfRequester: string,
  ): Promise<UserProfile | null> {
    try {
      const accessToken =
        await this.getAccessTokenFromSession(sessionIdOfRequester);
      if (!accessToken) {
        this.logger.warn(
          `Access token not found for session: ${sessionIdOfRequester}`,
        );
        return null;
      }
      const response = await firstValueFrom(
        this.httpService.get<{ data: UserProfile }>(
          `${this.decodeApiUrl}/users/profile/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to get profile for user ${userId}:`,
        error.stack,
      );
      return null;
    }
  }

  async updateBio(
    dto: { bio: string },
    accessToken: string,
    fingerprintHash: string,
  ): Promise<UserProfile> {
    try {
      const response = await firstValueFrom(
        this.httpService.put<{ data: UserProfile }>(
          `${this.decodeApiUrl}/users/profile/bio`,
          dto,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-fingerprint-hashed": fingerprintHash,
            },
          },
        ),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to update bio:`, error.stack);
      throw error;
    }
  }

  async updateAvatar(
    dto: { avatar_ipfs_hash: string },
    accessToken: string,
    fingerprintHash: string,
  ): Promise<UserProfile> {
    try {
      const response = await firstValueFrom(
        this.httpService.put<{ data: UserProfile }>(
          `${this.decodeApiUrl}/users/profile/avatar`,
          dto,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-fingerprint-hashed": fingerprintHash,
            },
          },
        ),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to update avatar:`, error.stack);
      throw error;
    }
  }

  async updateDisplayName(
    dto: { display_name: string },
    accessToken: string,
    fingerprintHash: string,
  ): Promise<UserProfile> {
    try {
      const response = await firstValueFrom(
        this.httpService.put<{ data: UserProfile }>(
          `${this.decodeApiUrl}/users/profile/display-name`,
          dto,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-fingerprint-hashed": fingerprintHash,
            },
          },
        ),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to update display name:`, error.stack);
      throw error;
    }
  }

  async getCurrentUserProfile(
    accessToken: string,
    fingerprintHash: string,
  ): Promise<UserProfile> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: UserProfile }>(
          `${this.decodeApiUrl}/users/profile/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-fingerprint-hashed": fingerprintHash,
            },
          },
        ),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to get current user profile:`, error.stack);
      throw error;
    }
  }

  async getAccessTokenFromSession(sessionId: string): Promise<string | null> {
    const sessionKey = `session:${sessionId}`;
    const sessionRaw = await this.redis.get(sessionKey);
    if (!sessionRaw) return null;
    try {
      const sessionData: SessionCacheDoc = JSON.parse(sessionRaw);
      return sessionData?.access_token || null;
    } catch {
      this.logger.error(`Failed to parse session data for key ${sessionKey}`);
      return null;
    }
  }
}
