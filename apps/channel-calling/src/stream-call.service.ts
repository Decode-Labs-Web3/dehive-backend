import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StreamClient } from "@stream-io/node-sdk";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class StreamCallService {
  private readonly logger = new Logger(StreamCallService.name);
  private readonly streamClient: StreamClient;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly environment: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("STREAM_API_KEY") || "";
    this.apiSecret = this.configService.get<string>("STREAM_API_SECRET") || "";
    this.environment =
      this.configService.get<string>("NODE_ENV") || "development";

    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        "STREAM_API_KEY and STREAM_API_SECRET must be set in environment variables",
      );
    }

    // Initialize Stream.io client
    this.streamClient = new StreamClient(this.apiKey, this.apiSecret);
  }

  async getStreamConfig(): Promise<{
    apiKey: string;
    environment: string;
  }> {
    this.logger.log("Getting Stream.io configuration");
    return {
      apiKey: this.apiKey,
      environment: this.environment,
    };
  }

  async generateStreamToken(userId: string): Promise<string> {
    this.logger.log(`Generating Stream.io token for user ${userId}`);

    try {
      // Create real Stream.io JWT token
      const token = this.streamClient.createToken(userId);
      this.logger.log(`Successfully created token for user ${userId}`);
      return token;
    } catch (error) {
      this.logger.error(`Error creating token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Tạo Stream.io Call ID cho channel call
   */
  generateStreamCallId(): string {
    // Tạo Stream.io Call ID theo format của Stream.io
    const randomId = uuidv4().replace(/-/g, "").substring(0, 20);
    return randomId;
  }

  async createChannelCall(
    channelId: string,
    participants: string[],
  ): Promise<{
    callId: string;
    callerToken: string;
    calleeToken: string;
    streamConfig: {
      apiKey: string;
      callType: string;
      callId: string;
      members: Array<{ user_id: string; role: string }>;
      settings: {
        audio: {
          default_device: string;
          is_default_enabled: boolean;
        };
        video: {
          camera_default_on: boolean;
          camera_facing: string;
        };
      };
    };
  }> {
    this.logger.log(`Creating channel call for channel ${channelId}`);

    // Generate real Stream.io Call ID
    const callId = this.generateStreamCallId();

    // Generate real tokens for participants
    const callerToken = await this.generateStreamToken(participants[0]);
    const calleeToken = participants[1]
      ? await this.generateStreamToken(participants[1])
      : callerToken;

    const streamConfig = {
      apiKey: this.apiKey,
      callType: "channel_call",
      callId,
      members: participants.map((userId, index) => ({
        user_id: userId,
        role: index === 0 ? "moderator" : "participant",
      })),
      settings: {
        audio: {
          default_device:
            this.configService.get<string>("AUDIO_DEFAULT_DEVICE") || "speaker",
          is_default_enabled:
            this.configService.get<boolean>("AUDIO_DEFAULT_ENABLED") ?? true,
        },
        video: {
          camera_default_on:
            this.configService.get<boolean>("VIDEO_DEFAULT_ON") ?? false,
          camera_facing:
            this.configService.get<string>("VIDEO_CAMERA_FACING") || "front",
        },
      },
    };

    return {
      callId,
      callerToken,
      calleeToken,
      streamConfig,
    };
  }
}
