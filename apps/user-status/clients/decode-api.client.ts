import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { UserProfile } from "../interfaces/user-profile.interface";

@Injectable()
export class DecodeApiClient {
  private readonly logger = new Logger(DecodeApiClient.name);
  private readonly decodeApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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

  async getUserProfilePublic(
    userDehiveId: string,
  ): Promise<UserProfile | null> {
    try {
      this.logger.log(
        `Calling Decode API (public): GET ${this.decodeApiUrl}/users/profile/${userDehiveId}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<{ success: boolean; data: UserProfile }>(
          `${this.decodeApiUrl}/users/profile/${userDehiveId}`,
        ),
      );

      if (!response.data.success || !response.data.data) {
        this.logger.warn(`Profile not found for ${userDehiveId}`);
        return null;
      }

      const profile = response.data.data;

      return {
        _id: profile._id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_ipfs_hash: profile.avatar_ipfs_hash || "",
      };
    } catch (error) {
      this.logger.error(
        `Error fetching public profile for ${userDehiveId}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  async getBulkUserProfiles(
    userIds: string[],
  ): Promise<Map<string, UserProfile>> {
    const profileMap = new Map<string, UserProfile>();

    await Promise.all(
      userIds.map(async (userId) => {
        const profile = await this.getUserProfilePublic(userId);
        if (profile) {
          profileMap.set(userId, profile);
        }
      }),
    );

    return profileMap;
  }
}
