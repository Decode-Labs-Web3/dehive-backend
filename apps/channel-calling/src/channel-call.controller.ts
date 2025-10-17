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
import { AuthGuard } from "../common/guards/auth.guard";
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
  @ApiOperation({ summary: "Join a Discord-style voice channel" })
  @ApiResponse({
    status: 200,
    description: "Joined voice channel successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Channel not found" })
  @ApiBearerAuth()
  async joinCall(
    @Body() joinCallDto: JoinCallDto,
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(
      `User ${user._id} joining voice channel ${joinCallDto.channel_id}`,
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
        message: "Joined voice channel successfully",
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
        message: "Failed to join voice channel",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post("leave")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Leave a Discord-style voice channel" })
  @ApiResponse({ status: 200, description: "Left voice channel successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Call or participant not found" })
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
        message: "Left voice channel successfully",
        data: {
          call_id: result.call._id,
          status: result.call.status,
          current_participants: result.call.current_participants,
        },
      };
    } catch (error) {
      this.logger.error("Error leaving call:", error);
      return {
        success: false,
        statusCode: 400,
        message: "Failed to leave voice channel",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get(":callId/participants")
  @ApiOperation({ summary: "Get call participants" })
  @ApiResponse({
    status: 200,
    description: "Participants retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Call not found" })
  @ApiBearerAuth()
  async getCallParticipants(
    @Param("callId") callId: string,
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(`Getting participants for call ${callId}`);

    try {
      const participants = await this.channelCallService.getCallParticipants(
        callId,
        user._id,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Participants retrieved successfully",
        data: {
          call_id: callId,
          participants,
        },
      };
    } catch (error) {
      this.logger.error("Error getting participants:", error);
      return {
        success: false,
        statusCode: 400,
        message: "Failed to get participants",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get(":callId/status")
  @ApiOperation({ summary: "Get call status" })
  @ApiResponse({
    status: 200,
    description: "Call status retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Call not found" })
  @ApiBearerAuth()
  async getCallStatus(
    @Param("callId") callId: string,
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(`Getting status for call ${callId}`);

    try {
      const call = await this.channelCallService.getCallStatus(
        callId,
        user._id,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Call status retrieved successfully",
        data: {
          call_id: callId,
          status: call.status,
          current_participants: call.current_participants,
          created_at: (call as any).createdAt,
          updated_at: (call as any).updatedAt,
        },
      };
    } catch (error) {
      this.logger.error("Error getting call status:", error);
      return {
        success: false,
        statusCode: 400,
        message: "Failed to get call status",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
