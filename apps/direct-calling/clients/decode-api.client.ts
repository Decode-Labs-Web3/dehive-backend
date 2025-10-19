import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { UserProfile } from "../interfaces/user-profile.interface";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";

@Injectable()
export class DecodeApiClient {
  private readonly logger = new Logger(DecodeApiClient.name);
  private readonly baseUrl: string;

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
    this.baseUrl = `http://${host}:${port}`;
  }

  async getUserProfile(
    sessionId: string,
    fingerprintHash: string,
    userDehiveId: string,
  ): Promise<UserProfile | null> {
    try {
      // Get access token from session
      const accessToken = await this.getAccessTokenFromSession(sessionId);
      if (!accessToken) {
        this.logger.warn(`Access token not found for session: ${sessionId}`);
        return null;
      }

      this.logger.log(
        `Calling Decode API: GET ${this.baseUrl}/users/profile/${userDehiveId}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<{ data: UserProfile }>(
          `${this.baseUrl}/users/profile/${userDehiveId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-fingerprint-hashed": fingerprintHash,
            },
          },
        ),
      );

      this.logger.log(
        `Decode API response: ${JSON.stringify(response.data, null, 2)}`,
      );
      this.logger.log(`Successfully retrieved user profile from Decode API.`);

      return response.data.data;
    } catch (error) {
      this.logger.error(`Error Response Status: ${error.response?.status}`);
      this.logger.error(
        `Error Response Data: ${JSON.stringify(error.response?.data)}`,
      );
      return null;
    }
  }

  private async getAccessTokenFromSession(
    sessionId: string,
  ): Promise<string | null> {
    try {
      const sessionKey = `session:${sessionId}`;
      const sessionRaw = await this.redis.get(sessionKey);
      if (!sessionRaw) return null;

      const sessionData = JSON.parse(sessionRaw);
      return sessionData?.access_token || null;
    } catch (error) {
      this.logger.error(
        `Failed to parse session data for key session:${sessionId}`,
        error,
      );
      return null;
    }
  }
}
