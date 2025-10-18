import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ChannelCallService } from "./channel-call.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/guards/auth.guard";
import { UserProfile } from "../interfaces/user-profile.interface";
import { Response } from "../interfaces/response.interface";
import { StreamTokenResponse } from "../interfaces/stream-info.interface";
import { JoinCallDto } from "../dto/join-call.dto";
import { LeaveCallDto } from "../dto/leave-call.dto";

@ApiTags("Channel Calling")
@Controller("channel-calls")
@UseGuards(AuthGuard)
export class ChannelCallController {
  private readonly logger = new Logger(ChannelCallController.name);

  constructor(private readonly channelCallService: ChannelCallService) {}

  @Post("join")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Join a voice channel call" })
  @ApiResponse({
    status: 200,
    description: "Successfully joined voice channel call",
  })
  @ApiBearerAuth()
  async joinCall(
    @Body() joinCallDto: JoinCallDto,
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(
      `User ${user._id} joining voice channel ${joinCallDto.channel_id}`,
    );

    try {
      const result = await this.channelCallService.joinChannel(
        user._id,
        joinCallDto.channel_id,
        joinCallDto.with_video ?? false,
        joinCallDto.with_audio ?? true,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Successfully joined voice channel call",
        data: {
          call: result.call,
          participant: result.participant,
          otherParticipants: result.otherParticipants,
          streamInfo: result.streamInfo,
        },
      };
    } catch (error) {
      this.logger.error("Error joining voice channel call:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to join voice channel call",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post("leave")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Leave a voice channel call" })
  @ApiResponse({
    status: 200,
    description: "Successfully left voice channel call",
  })
  @ApiBearerAuth()
  async leaveCall(
    @Body() leaveCallDto: LeaveCallDto,
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(
      `User ${user._id} leaving voice channel call ${leaveCallDto.call_id}`,
    );

    try {
      const result = await this.channelCallService.leaveCall(
        user._id,
        leaveCallDto.call_id,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Successfully left voice channel call",
        data: {
          call: result.call,
        },
      };
    } catch (error) {
      this.logger.error("Error leaving voice channel call:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to leave voice channel call",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get("test")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Test endpoint" })
  @ApiResponse({
    status: 200,
    description: "Test endpoint working",
  })
  @Public()
  async test(): Promise<Response> {
    return {
      success: true,
      statusCode: 200,
      message: "Channel calling service is working!",
      data: {
        service: "channel-calling",
        status: "active",
        stream_io: "enabled",
        webrtc: "disabled",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("stream-config")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get Stream.io configuration for channel calling" })
  @ApiResponse({
    status: 200,
    description: "Stream.io configuration retrieved successfully",
  })
  @Public()
  async getStreamConfig(): Promise<Response> {
    this.logger.log("Getting Stream.io configuration for channel calling");

    try {
      const config = await this.channelCallService.getStreamConfig();

      return {
        success: true,
        statusCode: 200,
        message: "Stream.io configuration retrieved successfully",
        data: config,
      };
    } catch (error) {
      this.logger.error("Error getting Stream.io configuration:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to get Stream.io configuration",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get("stream-token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get Stream.io token for channel calling" })
  @ApiResponse({
    status: 200,
    description: "Stream.io token retrieved successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        statusCode: { type: "number" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            token: { type: "string" },
            user_id: { type: "string" },
            stream_call_id: { type: "string" },
            stream_config: {
              type: "object",
              properties: {
                apiKey: { type: "string" },
                environment: { type: "string" },
              },
            },
          },
        },
      },
    },
  })
  @ApiBearerAuth()
  async getStreamToken(
    @CurrentUser() user: UserProfile,
  ): Promise<Response<StreamTokenResponse>> {
    this.logger.log(`Getting Stream.io token for user ${user._id}`);

    try {
      const token = await this.channelCallService.getStreamToken(user._id);
      const streamConfig = await this.channelCallService.getStreamConfig();
      const streamCallId = this.channelCallService.generateStreamCallId();

      return {
        success: true,
        statusCode: 200,
        message: "Stream.io token retrieved successfully",
        data: {
          token,
          user_id: user._id,
          stream_call_id: streamCallId, // Stream.io Call ID để join call
          stream_config: streamConfig,
        },
      };
    } catch (error) {
      this.logger.error("Error getting Stream.io token:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to get Stream.io token",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
