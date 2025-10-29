import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  UseGuards,
  Req,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { Request } from "express";
import { UserStatusService } from "./user-status.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import { ApiResponse } from "../dto/response.dto";

@Controller("status")
@UseGuards(AuthGuard)
export class UserStatusController {
  constructor(private readonly service: UserStatusService) {}

  /**
   * Get status + profile of all following users with pagination
   */
  @Get("user")
  async getUserStatus(
    @Req() request: Request,
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const user = request["user"] as AuthenticatedUser;
    if (!user || !user._id) {
      throw new BadRequestException("User not authenticated");
    }

    const result = await this.service.getFollowingUsersStatus(
      user._id,
      user.session_id,
      user.fingerprint_hash,
      page,
      limit,
    );

    return ApiResponse.ok(
      result,
      "Successfully fetched following users status",
    );
  }

  @Get("online")
  async getOnlineUsers(
    @Req() request: Request,
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const user = request["user"] as AuthenticatedUser;
    if (!user || !user._id) {
      throw new BadRequestException("User not authenticated");
    }

    const result = await this.service.getOnlineFollowingUsers(
      user._id,
      user.session_id,
      user.fingerprint_hash,
      page,
      limit,
    );

    return ApiResponse.ok(result, "Successfully fetched online users");
  }

  @Get("server/:serverId")
  async getOnlineServerMembers(
    @Param("serverId") serverId: string,
    @Req() request: Request,
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const user = request["user"] as AuthenticatedUser;
    if (!user || !user._id) {
      throw new BadRequestException("User not authenticated");
    }

    if (!serverId) {
      throw new BadRequestException("serverId is required");
    }

    const result = await this.service.getOnlineServerMembers(
      serverId,
      user.session_id,
      user.fingerprint_hash,
      page,
      limit,
    );

    return ApiResponse.ok(result, "Successfully fetched online server members");
  }

  /**
   * Get all members (online + offline) in a server with pagination
   */
  @Get("server/:serverId/all")
  async getAllServerMembers(
    @Param("serverId") serverId: string,
    @Req() request: Request,
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const user = request["user"] as AuthenticatedUser;
    if (!user || !user._id) {
      throw new BadRequestException("User not authenticated");
    }

    if (!serverId) {
      throw new BadRequestException("serverId is required");
    }

    const result = await this.service.getAllServerMembers(
      serverId,
      user.session_id,
      user.fingerprint_hash,
      page,
      limit,
    );

    return ApiResponse.ok(result, "Successfully fetched all server members");
  }
}
