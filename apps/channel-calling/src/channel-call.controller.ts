import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ChannelCallService } from "./channel-call.service";
import { AuthGuard, Public } from "../common/guards/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import { Response } from "../interfaces/response.interface";
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Response> {
    this.logger.log(
      `User ${user._id} joining voice channel ${joinCallDto.channel_id}`,
    );

    try {
      // User profiles fetched in real-time by WebSocket gateway via public API
      const result = await this.channelCallService.joinChannel(
        user._id,
        joinCallDto.channel_id,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Successfully joined voice channel call",
        data: {
          channel_id: result.call.channel_id,
          status: result.call.status,
          participant_count: result.call.current_participants,
          created_at: (result.call as unknown as Record<string, unknown>)
            .createdAt,
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Response> {
    this.logger.log(
      `User ${user._id} leaving voice channel ${leaveCallDto.channel_id}`,
    );

    try {
      const result = await this.channelCallService.leaveChannel(
        user._id,
        leaveCallDto.channel_id,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Successfully left voice channel call",
        data: {
          channel_id: leaveCallDto.channel_id,
          status: "left",
          participant_count: result.call.current_participants,
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
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("participants")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get participants in a channel call" })
  @ApiResponse({
    status: 200,
    description: "Participants retrieved successfully",
  })
  @ApiBearerAuth()
  async getParticipants(
    @Query("channel_id") channelId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Response> {
    this.logger.log(`Getting participants for channel ${channelId}`);

    try {
      const result = await this.channelCallService.getChannelParticipants(
        channelId,
        user.session_id,
        user.fingerprint_hash,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Participants retrieved successfully",
        data: {
          channel_id: channelId,
          participants: result.participants,
          count: result.participants.length,
        },
      };
    } catch (error) {
      this.logger.error("Error getting participants:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to get participants",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
