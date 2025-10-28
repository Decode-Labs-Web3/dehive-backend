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

    return this.service.getFollowingUsersStatus(
      user._id,
      user.session_id,
      user.fingerprint_hash,
      page,
      limit,
    );
  }

  /**
   * Get online users from current user's following list with pagination
   */
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

    return this.service.getOnlineFollowingUsers(
      user._id,
      user.session_id,
      user.fingerprint_hash,
      page,
      limit,
    );
  }

  /**
   * Get online members in a specific server with pagination
   */
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

    return this.service.getOnlineServerMembers(
      serverId,
      user.session_id,
      user.fingerprint_hash,
      page,
      limit,
    );
  }
}
