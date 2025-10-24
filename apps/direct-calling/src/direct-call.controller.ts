import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  Headers,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from "@nestjs/swagger";
import { DirectCallService } from "./direct-call.service";
import { AuthGuard, Public } from "../common/guards/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import { Response } from "../interfaces/response.interface";
import { StartCallDto } from "../dto/start-call.dto";
import { AcceptCallDto } from "../dto/accept-call.dto";
import { EndCallDto } from "../dto/end-call.dto";
import { DecodeApiClient } from "../clients/decode-api.client";

@ApiTags("Direct Calling")
@Controller("calls")
@UseGuards(AuthGuard)
export class DirectCallController {
  private readonly logger = new Logger(DirectCallController.name);

  constructor(
    private readonly directCallService: DirectCallService,
    private readonly decodeApiClient: DecodeApiClient,
  ) {}

  @Public()
  @Get("cache-profile")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cache user profiles to Redis",
    description:
      "Caches BOTH caller (from session) and target user profiles. Frontend calls this before making a call with target userDehiveId. This ensures both caller and callee profiles are available for WebSocket events.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Caller's session ID",
    required: true,
  })
  @ApiHeader({
    name: "x-fingerprint-hash",
    description: "Caller's fingerprint hash",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Both profiles cached successfully",
  })
  @ApiResponse({
    status: 400,
    description:
      "Failed to cache profiles - missing headers or invalid userDehiveId",
  })
  async cacheUserProfile(
    @Headers("x-session-id") sessionId: string,
    @Headers("x-fingerprint-hash") fingerprintHash: string,
    @Query("userDehiveId") targetUserId: string,
  ): Promise<Response> {
    this.logger.log(
      `Caching profiles: caller (from session) and target user ${targetUserId}`,
    );

    if (!sessionId || !fingerprintHash || !targetUserId) {
      return {
        success: false,
        statusCode: 400,
        message:
          "Missing required parameters: x-session-id, x-fingerprint-hash, and userDehiveId",
      };
    }

    try {
      // Cache target user profile
      const targetCached = await this.decodeApiClient.cacheUserProfile(
        targetUserId,
        sessionId,
        fingerprintHash,
      );

      // Cache caller profile (get caller ID from session, then call /users/profile/me)
      const callerCached = await this.decodeApiClient.cacheCallerProfile(
        sessionId,
        fingerprintHash,
      );

      if (!targetCached || !callerCached) {
        return {
          success: false,
          statusCode: 400,
          message: `Failed to cache profiles. Target: ${targetCached ? "✓" : "✗"}, Caller: ${callerCached ? "✓" : "✗"}`,
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: "Both caller and target profiles cached successfully",
      };
    } catch (error) {
      this.logger.error("Error caching user profiles:", error);
      return {
        success: false,
        statusCode: 400,
        message: "Failed to cache profiles",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post("start")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Start a new call" })
  @ApiResponse({ status: 200, description: "Call started successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiBearerAuth()
  async startCall(
    @Body() startCallDto: StartCallDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Response> {
    this.logger.log(
      `Starting call from ${user._id} to ${startCallDto.target_user_id}`,
    );

    try {
      // Note: Caller profile is already cached via AuthGuard when they authenticated
      // Target user profile should be cached by frontend calling GET /cache-profile before starting call
      // Both profiles will be available in Redis for WebSocket events

      const call = await this.directCallService.startCallForCurrentUser(
        startCallDto.target_user_id,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Call started successfully",
        data: {
          call_id: call._id,
          status: call.status,
          target_user_id: startCallDto.target_user_id,
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Response> {
    this.logger.log(`Accepting call ${acceptCallDto.call_id} by ${user._id}`);

    try {
      // Note: Callee profile is already cached when they authenticated via AuthGuard
      // No need to cache again

      const call = await this.directCallService.acceptCallForCurrentUser(
        acceptCallDto.call_id,
      );

      return {
        success: true,
        statusCode: 200,
        message: "Call accepted successfully",
        data: {
          call_id: call._id,
          status: call.status,
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Response> {
    this.logger.log(`Declining call ${data.call_id} by ${user._id}`);

    try {
      const call = await this.directCallService.declineCallForCurrentUser(
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Response> {
    this.logger.log(`Ending call ${endCallDto.call_id} by ${user._id}`);

    try {
      const call = await this.directCallService.endCallForCurrentUser(
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
  @ApiOperation({ summary: "Get all active calls" })
  @ApiResponse({
    status: 200,
    description: "Active calls retrieved successfully",
  })
  @ApiBearerAuth()
  async getActiveCalls(
    @CurrentUser() _user: AuthenticatedUser,
  ): Promise<Response> {
    this.logger.log(`Getting active calls`);

    try {
      const activeCalls = await this.directCallService.getActiveCalls();

      return {
        success: true,
        statusCode: 200,
        message: "Active calls retrieved successfully",
        data: activeCalls,
      };
    } catch (error) {
      this.logger.error("Error getting active calls:", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to get active calls",
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
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: { limit?: number; offset?: number } = {},
  ): Promise<Response> {
    this.logger.log(`Getting call history for user ${user._id}`);

    try {
      const calls = await this.directCallService.getCallHistoryForCurrentUser(
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
