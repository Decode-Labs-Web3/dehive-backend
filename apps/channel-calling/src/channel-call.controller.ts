import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
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
import { UserProfile } from "../interfaces/user-profile.interface";
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
  @ApiResponse({ status: 200, description: "Joined call successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Channel not found" })
  @ApiBearerAuth()
  async joinCall(
    @Body() joinCallDto: JoinCallDto,
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(
      `User ${user._id} joining call in channel ${joinCallDto.channel_id}`,
    );

    try {
      const result = await this.channelCallService.joinCall(
        user._id,
        joinCallDto.channel_id,
        joinCallDto.with_video ?? false,
        joinCallDto.with_audio ?? true,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Joined call successfully",
        data: {
          call_id: result.call._id,
          participant_id: result.participant._id,
          status: result.call.status,
          current_participants: result.call.current_participants,
          other_participants: result.otherParticipants,
        },
      };
    } catch (error) {
      this.logger.error("Error joining call:", error);
      return {
        success: false,
        statusCode: 400,
        message: "Failed to join call",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post("leave")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Leave a voice channel call" })
  @ApiResponse({ status: 200, description: "Left call successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Call not found" })
  @ApiBearerAuth()
  async leaveCall(
    @Body() leaveCallDto: LeaveCallDto,
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(`User ${user._id} leaving call ${leaveCallDto.call_id}`);

    try {
      const result = await this.channelCallService.leaveCall(
        user._id,
        leaveCallDto.call_id,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Left call successfully",
        data: {
          call_id: result.call._id,
          status: result.call.status,
          duration_seconds: result.participant.duration_seconds,
          remaining_participants: result.call.current_participants,
        },
      };
    } catch (error) {
      this.logger.error("Error leaving call:", error);
      return {
        success: false,
        statusCode: 400,
        message: "Failed to leave call",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get("channel/:channel_id")
  @ApiOperation({ summary: "Get active call for a channel" })
  @ApiResponse({
    status: 200,
    description: "Active call retrieved successfully",
  })
  @ApiBearerAuth()
  async getActiveCallByChannel(
    @Param("channel_id") channelId: string,
    @CurrentUser() _user: UserProfile,
  ): Promise<Response> {
    this.logger.log(`Getting active call for channel ${channelId}`);

    try {
      const call = await this.channelCallService.getActiveCallByChannel(channelId);

      if (!call) {
        return {
          success: true,
          statusCode: 200,
          message: "No active call in this channel",
          data: null,
        };
      }

      const participants = await this.channelCallService.getParticipants(
        String((call as Record<string, unknown>)._id),
      );

      return {
        success: true,
        statusCode: 200,
        message: "Active call retrieved successfully",
        data: {
          ...call,
          participants,
        },
      };
    } catch (error) {
      this.logger.error("Error getting active call:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to get active call",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get("my-calls")
  @ApiOperation({ summary: "Get my active calls" })
  @ApiResponse({ status: 200, description: "Active calls retrieved" })
  @ApiBearerAuth()
  async getMyCalls(@CurrentUser() user: UserProfile): Promise<Response> {
    this.logger.log(`Getting active calls for user ${user._id}`);

    try {
      const calls = await this.channelCallService.getUserActiveCalls(user._id);

      return {
        success: true,
        statusCode: 200,
        message: "Active calls retrieved successfully",
        data: {
          calls,
          total: calls.length,
        },
      };
    } catch (error) {
      this.logger.error("Error getting user calls:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to get user calls",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

@ApiTags("TURN/ICE Configuration")
@Controller("channel-turn")
export class ChannelTurnController {
  private readonly logger = new Logger(ChannelTurnController.name);

  constructor(private readonly channelCallService: ChannelCallService) {}

  @Get("credentials")
  @Public()
  @ApiOperation({ summary: "Get TURN server credentials" })
  @ApiResponse({
    status: 200,
    description: "TURN credentials retrieved successfully",
  })
  async getTurnCredentials(): Promise<Response> {
    this.logger.log("Getting TURN credentials");

    try {
      const credentials = await this.channelCallService.getTurnCredentials();

      return {
        success: true,
        statusCode: 200,
        message: "TURN credentials retrieved successfully",
        data: credentials,
      };
    } catch (error) {
      this.logger.error("Error getting TURN credentials:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to get TURN credentials",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get("ice-servers")
  @Public()
  @ApiOperation({ summary: "Get ICE servers configuration" })
  @ApiResponse({
    status: 200,
    description: "ICE servers retrieved successfully",
  })
  async getIceServers(): Promise<Response> {
    this.logger.log("Getting ICE servers");

    try {
      const iceServers = await this.channelCallService.getIceServers();

      return {
        success: true,
        statusCode: 200,
        message: "ICE servers retrieved successfully",
        data: {
          iceServers,
        },
      };
    } catch (error) {
      this.logger.error("Error getting ICE servers:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to get ICE servers",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
