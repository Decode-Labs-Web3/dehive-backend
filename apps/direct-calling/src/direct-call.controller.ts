import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { DirectCallService } from "./direct-call.service";
import { AuthGuard, Public } from "../common/guards/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserProfile } from "../interfaces/user-profile.interface";
import { Response } from "../interfaces/response.interface";
import { StartCallDto } from "../dto/start-call.dto";
import { AcceptCallDto } from "../dto/accept-call.dto";
import { EndCallDto } from "../dto/end-call.dto";

@ApiTags("Direct Calling")
@Controller("calls")
@UseGuards(AuthGuard)
export class DirectCallController {
  private readonly logger = new Logger(DirectCallController.name);

  constructor(private readonly directCallService: DirectCallService) {}

  @Post("start")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Start a new call" })
  @ApiResponse({ status: 200, description: "Call started successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiBearerAuth()
  async startCall(
    @Body() startCallDto: StartCallDto,
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(
      `Starting call from ${user._id} to ${startCallDto.target_user_id}`,
    );

    try {
      const call = await this.directCallService.startCall(
        user._id,
        startCallDto.target_user_id,
        startCallDto.with_video ?? true,
        startCallDto.with_audio ?? true,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Call started successfully",
        data: {
          call_id: call._id,
          status: call.status,
          target_user_id: startCallDto.target_user_id,
          with_video: startCallDto.with_video ?? true,
          with_audio: startCallDto.with_audio ?? true,
          created_at: (call as unknown as Record<string, unknown>).createdAt,
        },
      };
    } catch (error) {
      this.logger.error("Error starting call:", error);
      return {
        success: false,
        statusCode: 400,
        message: "Failed to start call",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post("accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept an incoming call" })
  @ApiResponse({ status: 200, description: "Call accepted successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Call not found" })
  @ApiBearerAuth()
  async acceptCall(
    @Body() acceptCallDto: AcceptCallDto,
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(`Accepting call ${acceptCallDto.call_id} by ${user._id}`);

    try {
      const call = await this.directCallService.acceptCall(
        user._id,
        acceptCallDto.call_id,
        acceptCallDto.with_video ?? true,
        acceptCallDto.with_audio ?? true,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Call accepted successfully",
        data: {
          call_id: call._id,
          status: call.status,
          with_video: acceptCallDto.with_video ?? true,
          with_audio: acceptCallDto.with_audio ?? true,
          started_at: call.started_at,
        },
      };
    } catch (error) {
      this.logger.error("Error accepting call:", error);
      return {
        success: false,
        statusCode: 400,
        message: "Failed to accept call",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post("decline")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Decline an incoming call" })
  @ApiResponse({ status: 200, description: "Call declined successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Call not found" })
  @ApiBearerAuth()
  async declineCall(
    @Body() data: { call_id: string },
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(`Declining call ${data.call_id} by ${user._id}`);

    try {
      const call = await this.directCallService.declineCall(
        user._id,
        data.call_id,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Call declined successfully",
        data: {
          call_id: call._id,
          status: call.status,
          end_reason: call.end_reason,
          ended_at: call.ended_at,
        },
      };
    } catch (error) {
      this.logger.error("Error declining call:", error);
      return {
        success: false,
        statusCode: 400,
        message: "Failed to decline call",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post("end")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "End an active call" })
  @ApiResponse({ status: 200, description: "Call ended successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Call not found" })
  @ApiBearerAuth()
  async endCall(
    @Body() endCallDto: EndCallDto,
    @CurrentUser() user: UserProfile,
  ): Promise<Response> {
    this.logger.log(`Ending call ${endCallDto.call_id} by ${user._id}`);

    try {
      const call = await this.directCallService.endCall(
        user._id,
        endCallDto.call_id,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Call ended successfully",
        data: {
          call_id: call._id,
          status: call.status,
          end_reason: call.end_reason,
          duration_seconds: call.duration_seconds,
          ended_at: call.ended_at,
        },
      };
    } catch (error) {
      this.logger.error("Error ending call:", error);
      return {
        success: false,
        statusCode: 400,
        message: "Failed to end call",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get("active")
  @ApiOperation({ summary: "Get active call for current user" })
  @ApiResponse({
    status: 200,
    description: "Active call retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "No active call found" })
  @ApiBearerAuth()
  async getActiveCall(@CurrentUser() user: UserProfile): Promise<Response> {
    this.logger.log(`Getting active call for user ${user._id}`);

    try {
      const call = await this.directCallService.getActiveCall(user._id);

      if (!call) {
        return {
          success: true,
          statusCode: 200,
          message: "No active call found",
          data: null,
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: "Active call retrieved successfully",
        data: {
          call_id: (call as Record<string, unknown>)._id,
          status: (call as Record<string, unknown>).status,
          caller_id: (call as Record<string, unknown>).caller_id,
          callee_id: (call as Record<string, unknown>).callee_id,
          started_at: (call as Record<string, unknown>).started_at,
          caller_audio_enabled: (call as Record<string, unknown>)
            .caller_audio_enabled,
          caller_video_enabled: (call as Record<string, unknown>)
            .caller_video_enabled,
          callee_audio_enabled: (call as Record<string, unknown>)
            .callee_audio_enabled,
          callee_video_enabled: (call as Record<string, unknown>)
            .callee_video_enabled,
          caller_audio_muted: (call as Record<string, unknown>)
            .caller_audio_muted,
          caller_video_muted: (call as Record<string, unknown>)
            .caller_video_muted,
          callee_audio_muted: (call as Record<string, unknown>)
            .callee_audio_muted,
          callee_video_muted: (call as Record<string, unknown>)
            .callee_video_muted,
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

  @Get("history")
  @ApiOperation({ summary: "Get call history for current user" })
  @ApiResponse({
    status: 200,
    description: "Call history retrieved successfully",
  })
  @ApiBearerAuth()
  async getCallHistory(
    @CurrentUser() user: UserProfile,
    @Body() data: { limit?: number; offset?: number } = {},
  ): Promise<Response> {
    this.logger.log(`Getting call history for user ${user._id}`);

    try {
      const calls = await this.directCallService.getCallHistory(
        user._id,
        data.limit ?? 20,
        data.offset ?? 0,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Call history retrieved successfully",
        data: {
          calls,
          total: calls.length,
          limit: data.limit ?? 20,
          offset: data.offset ?? 0,
        },
      };
    } catch (error) {
      this.logger.error("Error getting call history:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to get call history",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

@ApiTags("TURN/ICE Configuration")
@Controller("turn")
export class TurnController {
  private readonly logger = new Logger(TurnController.name);

  constructor(private readonly directCallService: DirectCallService) {}

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
      const credentials = await this.directCallService.getTurnCredentials();

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
      const iceServers = await this.directCallService.getIceServers();

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
