import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
// import { StreamCall } from "@stream-io/node-sdk"; // Will be used when implementing real Stream.io integration
import { v4 as uuidv4 } from "uuid";
import {
  StreamInfo,
  StreamConfig,
} from "../../interfaces/stream-info.interface";

@Injectable()
export class StreamCallService {
  private readonly logger = new Logger(StreamCallService.name);
  private readonly streamClient: unknown; // Stream.io client
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("STREAM_API_KEY") || "";
    this.apiSecret = this.configService.get<string>("STREAM_API_SECRET") || "";

    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        "STREAM_API_KEY and STREAM_API_SECRET must be set in environment variables",
      );
    }

    // Initialize Stream.io client
    this.streamClient = null; // Will be initialized when needed
  }

  /**
   * Tạo token cho user để authenticate với Stream.io
   */
  async createUserToken(userId: string): Promise<string> {
    try {
      this.logger.log(`Creating Stream.io token for user ${userId}`);

      // For now, return a mock token - in real implementation,
      // you would use Stream.io SDK to create actual tokens
      const token = `stream_token_${userId}_${Date.now()}`;

      this.logger.log(`Successfully created token for user ${userId}`);
      return token;
    } catch (error) {
      this.logger.error(`Error creating token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Tạo call ID unique cho cuộc gọi 1:1
   */
  private async createCallId(
    callerId: string,
    calleeId: string,
  ): Promise<string> {
    // Tạo call ID unique dựa trên user IDs và timestamp
    const timestamp = Date.now();
    const randomId = uuidv4().substring(0, 8);
    return `call_${callerId}_${calleeId}_${timestamp}_${randomId}`;
  }

  /**
   * Tạo thông tin call cho Stream.io
   */
  async createCallInfo(
    callerId: string,
    calleeId: string,
    withVideo: boolean = true,
    withAudio: boolean = true,
  ): Promise<StreamInfo> {
    try {
      this.logger.log(`Creating call info for ${callerId} -> ${calleeId}`);

      const callId = await this.createCallId(callerId, calleeId);

      // Tạo tokens cho cả caller và callee
      const [callerToken, calleeToken] = await Promise.all([
        this.createUserToken(callerId),
        this.createUserToken(calleeId),
      ]);

      const callInfo = {
        callId,
        callerToken,
        calleeToken,
        streamConfig: {
          apiKey: this.apiKey,
          callType: "default", // Stream.io call type
          callId,
          members: [
            {
              user_id: callerId,
              role: "caller",
            },
            {
              user_id: calleeId,
              role: "callee",
            },
          ],
          settings: {
            audio: {
              default_device: "speaker",
              is_default_enabled: withAudio,
            },
            video: {
              camera_default_on: withVideo,
              camera_facing: "front",
            },
          },
        },
      };

      this.logger.log(`Successfully created call info: ${callId}`);
      return callInfo;
    } catch (error) {
      this.logger.error(
        `Error creating call info for ${callerId} -> ${calleeId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Lấy thông tin call từ Stream.io (nếu cần)
   */
  async getCallInfo(callId: string) {
    try {
      this.logger.log(`Getting call info for ${callId}`);

      // Stream.io sẽ handle việc này, chúng ta chỉ cần trả về callId
      return {
        callId,
        status: "active",
        streamConfig: {
          apiKey: this.apiKey,
          callType: "default",
          callId,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting call info for ${callId}:`, error);
      throw error;
    }
  }

  /**
   * End call trong Stream.io (nếu cần cleanup)
   */
  async endCall(callId: string): Promise<void> {
    try {
      this.logger.log(`Ending Stream.io call ${callId}`);

      // Stream.io sẽ tự động handle cleanup khi call end
      // Chúng ta chỉ cần log
      this.logger.log(`Stream.io call ${callId} ended`);
    } catch (error) {
      this.logger.error(`Error ending Stream.io call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Validate user có thể tham gia call không
   */
  async validateUserForCall(userId: string, callId: string): Promise<boolean> {
    try {
      // Kiểm tra callId có chứa userId không (vì chúng ta tạo callId dựa trên user IDs)
      const callIdParts = callId.split("_");
      const callerId = callIdParts[1];
      const calleeId = callIdParts[2];

      return userId === callerId || userId === calleeId;
    } catch (error) {
      this.logger.error(
        `Error validating user ${userId} for call ${callId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Lấy Stream.io configuration cho frontend
   */
  getStreamConfig(): StreamConfig {
    return {
      apiKey: this.apiKey,
      environment: this.configService.get<string>("NODE_ENV") || "development",
    };
  }
}
