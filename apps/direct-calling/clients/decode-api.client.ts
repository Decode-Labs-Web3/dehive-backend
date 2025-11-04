import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { UserProfile } from "../interfaces/user-profile.interface";
import { Wallet } from "../interfaces/wallet.interface";

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

  /**
   * Get user profile from public endpoint (no authentication required)
   * Used by WebSocket gateway for real-time user data in call events
   */
  async getUserProfilePublic(
    userDehiveId: string,
  ): Promise<Partial<UserProfile> | null> {
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

      // Extract wallets array from Decode API response
      const walletsArray: Wallet[] =
        (profile as { wallets?: Wallet[] }).wallets || [];

      return {
        _id: profile._id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_ipfs_hash: profile.avatar_ipfs_hash || "",
        wallets: walletsArray,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching public profile for ${userDehiveId}:`,
        error.response?.status,
        error.response?.data,
      );
      return null;
    }
  }
}
