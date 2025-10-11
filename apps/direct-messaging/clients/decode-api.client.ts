import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { FollowingResponse } from "../interfaces/following-user.interface";

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

  async getFollowing(
    accessToken: string,
    fingerprintHash: string,
    page: number = 0,
    limit: number = 10,
  ): Promise<FollowingResponse | null> {
    try {
      this.logger.log(
        `Calling Decode API: GET ${this.decodeApiUrl}/relationship/follow/followings/me`,
      );

      const response = await firstValueFrom(
        this.httpService.get<FollowingResponse>(
          `${this.decodeApiUrl}/relationship/follow/followings/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-fingerprint-hashed": fingerprintHash,
            },
            params: {
              page,
              limit,
            },
          },
        ),
      );

      console.log(response);
      this.logger.log(
        `Decode API response: ${JSON.stringify(response.data, null, 2)}`,
      );
      this.logger.log(`Successfully retrieved following list from Decode API.`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error Response Status: ${error.response.status}`);
      this.logger.error(
        `Error Response Data: ${JSON.stringify(error.response.data)}`,
      );
      return null;
    }
  }
}
