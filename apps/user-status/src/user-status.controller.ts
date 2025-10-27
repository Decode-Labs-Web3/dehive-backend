import {
  Controller,
  Get,
  Query,
  ParseBoolPipe,
  BadRequestException,
} from "@nestjs/common";
import { UserStatusService } from "./user-status.service";

@Controller("status")
export class UserStatusController {
  constructor(private readonly service: UserStatusService) {}

  @Get("user")
  async getUserStatus(
    @Query("user_id") userId: string,
    @Query("include_profile", new ParseBoolPipe({ optional: true }))
    includeProfile?: boolean,
  ) {
    if (!userId) {
      throw new BadRequestException("user_id query parameter is required");
    }

    const result = await this.service.getUserStatus(
      userId,
      includeProfile || false,
    );

    if (!result) {
      throw new BadRequestException(`User status not found for ${userId}`);
    }

    return result;
  }

  @Get("bulk")
  async getBulkStatus(
    @Query("user_ids") userIds: string,
    @Query("include_profile", new ParseBoolPipe({ optional: true }))
    includeProfile?: boolean,
  ) {
    if (!userIds) {
      throw new BadRequestException("user_ids query parameter is required");
    }

    const ids = userIds.split(",").filter((id) => id.trim());

    if (ids.length === 0) {
      throw new BadRequestException("user_ids must contain at least one ID");
    }

    return this.service.getBulkUserStatus(ids, includeProfile || false);
  }

  @Get("online")
  async getOnlineUsers() {
    return this.service.getOnlineUsers();
  }
}
