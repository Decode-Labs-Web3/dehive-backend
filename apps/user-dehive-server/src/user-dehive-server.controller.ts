import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Put,
  Delete,
  UseGuards,
  Headers,
} from "@nestjs/common";
import { UserDehiveServerService } from "./user-dehive-server.service";
import { AssignRoleDto } from "../dto/assign-role.dto";
import { TransferOwnershipDto } from "../dto/transfer-ownership.dto";
import { GenerateInviteDto } from "../dto/generate-invite.dto";
import { JoinServerDto } from "../dto/join-server.dto";
import { KickBanDto } from "../dto/kick-ban.dto";
import { LeaveServerDto } from "../dto/leave-server.dto";
import { UnbanDto } from "../dto/unban.dto";
import { UpdateNotificationDto } from "../dto/update-notification.dto";
import { GetServerMembersDto } from "../dto/get-server-members.dto";
import { UpdateBioDto } from "../dto/update-bio.dto";
import { UpdateAvatarDto } from "../dto/update-avatar.dto";
import { UpdateDisplayNameDto } from "../dto/update-display-name.dto";
import { AuthGuard } from "../common/guards/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from "@nestjs/swagger";

@ApiTags("Memberships & Profiles")
@Controller("memberships")
@UseGuards(AuthGuard)
export class UserDehiveServerController {
  constructor(private readonly service: UserDehiveServerService) {}

  @Post("join")
  @ApiOperation({
    summary: "Join a server",
    description:
      "Allows a user to become a member of a server. If user is already a member, returns success with server_id and server_name.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: "Successfully joined the server (returns empty object).",
    schema: {
      example: {},
    },
  })
  @ApiResponse({
    status: 201,
    description:
      "User is already a member (returns server_id and server_name for frontend redirect).",
    schema: {
      example: {
        server_id: "507f1f77bcf86cd799439011",
        server_name: "My Awesome Server",
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden (e.g., user is banned).",
  })
  @ApiResponse({
    status: 404,
    description: "Server or Dehive Profile not found.",
  })
  joinServer(@Body() dto: JoinServerDto, @CurrentUser("_id") _id: string) {
    return this.service.joinServer(dto, _id);
  }

  @Delete("server/:serverId/leave")
  @ApiOperation({
    summary: "Leave a server",
    description: "Allows a user to leave a server they are a member of.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({ name: "serverId", description: "The ID of the server to leave" })
  @ApiResponse({ status: 200, description: "Successfully left the server." })
  @ApiResponse({
    status: 403,
    description: "Forbidden (e.g., owner cannot leave).",
  })
  leaveServer(
    @Param("serverId") serverId: string,
    @CurrentUser("_id") _id: string,
  ) {
    const dto: LeaveServerDto = {
      server_id: serverId,
    };
    return this.service.leaveServer(dto, _id);
  }

  @Post("invite/generate")
  @ApiOperation({
    summary: "Generate an invite link",
    description: "Generates a new invite link for a server.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: "Invite link created successfully.",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden (e.g., user is not a member).",
  })
  generateInvite(
    @Body() dto: GenerateInviteDto,
    @CurrentUser("_id") actorBaseId: string,
  ) {
    return this.service.generateInvite(dto, actorBaseId);
  }

  @Post("invite/use/:code")
  @ApiOperation({
    summary: "Use an invite link",
    description:
      "Allows a user to join a server using an invite code. If user is already a member, returns success with server_id and server_name.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({ name: "code", description: "The unique invite code" })
  @ApiResponse({
    status: 201,
    description: "Successfully joined the server via invite.",
    schema: {
      example: {},
    },
  })
  @ApiResponse({
    status: 201,
    description:
      "User is already a member (returns server_id and server_name for frontend redirect).",
    schema: {
      example: {
        server_id: "507f1f77bcf86cd799439011",
        server_name: "My Awesome Server",
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Invite link is invalid or has expired.",
  })
  useInvite(
    @Param("code") code: string,
    @CurrentUser("_id") actorBaseId: string,
  ) {
    return this.service.useInvite(code, actorBaseId);
  }

  @Post("kick")
  @ApiOperation({
    summary: "Kick a member",
    description:
      "Kicks a member from a server. Requires moderator or owner permissions.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({ status: 201, description: "User successfully kicked." })
  @ApiResponse({
    status: 403,
    description: "Forbidden (insufficient permissions).",
  })
  kickMember(@Body() dto: KickBanDto, @CurrentUser("_id") actorBaseId: string) {
    return this.service.kickOrBan(dto, "kick", actorBaseId);
  }

  @Post("ban")
  @ApiOperation({
    summary: "Ban a member",
    description:
      "Bans a member from a server. Requires moderator or owner permissions.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({ status: 201, description: "User successfully banned." })
  @ApiResponse({
    status: 403,
    description: "Forbidden (insufficient permissions).",
  })
  banMember(@Body() dto: KickBanDto, @CurrentUser("_id") actorBaseId: string) {
    return this.service.kickOrBan(dto, "ban", actorBaseId);
  }

  @Post("unban")
  @ApiOperation({
    summary: "Unban a member",
    description:
      "Unbans a previously banned member. Requires moderator or owner permissions.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({ status: 201, description: "User successfully unbanned." })
  @ApiResponse({ status: 404, description: "Ban record not found." })
  unbanMember(@Body() dto: UnbanDto, @CurrentUser("_id") actorBaseId: string) {
    return this.service.unbanMember(dto, actorBaseId);
  }

  @Patch("role")
  @ApiOperation({
    summary: "Assign a role to a member",
    description: "Changes role of member. Requires owner permissions.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({ status: 200, description: "Role updated successfully." })
  @ApiResponse({
    status: 403,
    description: "Forbidden (only owner can assign roles).",
  })
  assignRole(
    @Body() dto: AssignRoleDto,
    @CurrentUser("_id") actorBaseId: string,
  ) {
    return this.service.assignRole(dto, actorBaseId);
  }

  @Patch("transfer-ownership")
  @ApiOperation({
    summary: "Transfer server ownership",
    description:
      "Transfers ownership of server to another member. Only current owner can do this.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of current owner",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Ownership transferred successfully.",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden (only current owner can transfer ownership).",
  })
  @ApiResponse({
    status: 404,
    description: "New owner is not a member of this server.",
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request (e.g., cannot transfer to yourself).",
  })
  transferOwnership(
    @Body() dto: TransferOwnershipDto,
    @CurrentUser("_id") currentOwnerId: string,
  ) {
    return this.service.transferOwnership(dto, currentOwnerId);
  }

  @Patch("notification")
  @ApiOperation({
    summary: "Update notification settings",
    description:
      "Mutes or unmutes notifications for a user in a specific server.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({ status: 200, description: "Notification settings updated." })
  @ApiResponse({ status: 404, description: "Membership not found." })
  updateNotification(
    @Body() dto: UpdateNotificationDto,
    @CurrentUser("_id") actorBaseId: string,
  ) {
    return this.service.updateNotification(dto, actorBaseId);
  }

  @Get("server/:serverId/members")
  @ApiOperation({
    summary: "Get all members in a server",
    description: "Retrieves a list of all members for a specific server.",
  })
  @ApiHeader({ name: "x-session-id", required: true })
  @ApiParam({ name: "serverId", description: "The ID of the server" })
  @ApiResponse({ status: 200, description: "Returns a list of members." })
  getMembersInServer(
    @Param() params: GetServerMembersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getMembersInServer(params.serverId, user);
  }

  @Get("profile/:userId")
  @ApiOperation({
    summary: "Get enriched user profile",
    description:
      "Retrieves a full user profile, including mutual servers, from the perspective of the current user.",
  })
  @ApiHeader({ name: "x-session-id", required: true })
  @ApiParam({ name: "_id", description: "The ID of the user profile to view" })
  @ApiResponse({
    status: 200,
    description: "Returns the enriched user profile.",
  })
  @ApiResponse({ status: 404, description: "User not found." })
  getEnrichedUserProfile(
    @Param("userId") targetUserId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.getEnrichedUserProfile(targetUserId, currentUser);
  }

  @Put("profile/bio")
  @ApiOperation({
    summary: "Update user bio",
    description: "Updates user bio by calling external API.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Bio updated successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request (e.g., bio too long).",
  })
  @ApiResponse({
    status: 404,
    description: "User profile not found.",
  })
  updateBio(
    @Body() dto: UpdateBioDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("x-fingerprint-hashed") fingerprintHash: string,
  ) {
    return this.service.updateBio(
      dto,
      user._id,
      user.session_id,
      fingerprintHash,
    );
  }

  @Put("profile/avatar")
  @ApiOperation({
    summary: "Update user avatar",
    description: "Updates user avatar by calling external API.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Avatar updated successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request (e.g., invalid IPFS hash).",
  })
  @ApiResponse({
    status: 404,
    description: "User profile not found.",
  })
  updateAvatar(
    @Body() dto: UpdateAvatarDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("x-fingerprint-hashed") fingerprintHash: string,
  ) {
    return this.service.updateAvatar(
      dto,
      user._id,
      user.session_id,
      fingerprintHash,
    );
  }

  @Put("profile/display-name")
  @ApiOperation({
    summary: "Update user display name",
    description: "Updates user display name by calling external API.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Display name updated successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request (e.g., display name too long).",
  })
  @ApiResponse({
    status: 404,
    description: "User profile not found.",
  })
  updateDisplayName(
    @Body() dto: UpdateDisplayNameDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("x-fingerprint-hashed") fingerprintHash: string,
  ) {
    return this.service.updateDisplayName(
      dto,
      user._id,
      user.session_id,
      fingerprintHash,
    );
  }

  @Get("servers/:serverId/ban-list")
  @ApiOperation({
    summary: "Get server ban list",
    description:
      "Retrieves the list of banned users for a specific server. Only the server owner can access this list.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({
    name: "serverId",
    description: "The ID of the server to get ban list for",
    example: "68c5adb6ec465897d540c58",
  })
  @ApiResponse({
    status: 200,
    description: "Ban list retrieved successfully.",
    schema: {
      type: "object",
      properties: {
        server_id: { type: "string" },
        total_banned: { type: "number" },
        banned_users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              _id: { type: "string" },
              server_id: { type: "string" },
              user_dehive_id: { type: "string" },
              banned_by: { type: "string" },
              reason: { type: "string" },
              expires_at: { type: "string", format: "date-time" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
              is_banned: { type: "boolean", enum: [true] },
              user_profile: { type: "object" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions.",
  })
  @ApiResponse({
    status: 404,
    description: "Server not found.",
  })
  async getBanList(
    @Param("serverId") serverId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getBanList(serverId, user._id, user.session_id);
  }
}
