import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserDehiveServerService } from './user-dehive-server.service';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { JoinServerDto } from '../dto/join-server.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { LeaveServerDto } from '../dto/leave-server.dto';
import { UnbanDto } from '../dto/unban.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { AuthGuard, Public } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('Memberships & Profiles')
@Controller('memberships')
@UseGuards(AuthGuard)
export class UserDehiveServerController {
  constructor(private readonly service: UserDehiveServerService) {}

  @Post('join')
  @ApiOperation({
    summary: 'Join a server',
    description: 'Allows a user to become a member of a server.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined the server.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., already a member).',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (e.g., user is banned).',
  })
  @ApiResponse({
    status: 404,
    description: 'Server or Dehive Profile not found.',
  })
  joinServer(
    @Body() dto: JoinServerDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.joinServer(dto, userId);
  }

  @Delete('server/:serverId/leave')
  @ApiOperation({
    summary: 'Leave a server',
    description: 'Allows a user to leave a server they are a member of.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiParam({ name: 'serverId', description: 'The ID of the server to leave' })
  @ApiResponse({ status: 200, description: 'Successfully left the server.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (e.g., owner cannot leave).',
  })
  leaveServer(
    @Param('serverId') serverId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const dto: LeaveServerDto = {
      server_id: serverId,
    };
    return this.service.leaveServer(dto, userId);
  }

  @Get('server/:serverId/members')
  @ApiOperation({
    summary: 'Get all members in a server',
    description: 'Retrieves a list of all members for a specific server.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiParam({ name: 'serverId', description: 'The ID of the server' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of members.',
  })
  getMembersInServer(@Param('serverId') serverId: string) {
    return this.service.getMembersInServer(serverId);
  }

  @Post('invite/generate')
  @ApiOperation({
    summary: 'Generate an invite link',
    description: 'Generates a new invite link for a server.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Invite link created successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (e.g., user is not a member).',
  })
  generateInvite(
    @Body() dto: GenerateInviteDto,
    @CurrentUser('userId') actorBaseId: string,
  ) {
    return this.service.generateInvite(dto, actorBaseId);
  }

  @Post('invite/use/:code')
  @ApiOperation({
    summary: 'Use an invite link',
    description: 'Allows a user to join a server using an invite code.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiParam({ name: 'code', description: 'The unique invite code' })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined the server via invite.',
  })
  @ApiResponse({
    status: 404,
    description: 'Invite link is invalid or has expired.',
  })
  useInvite(
    @Param('code') code: string,
    @CurrentUser('userId') actorBaseId: string,
  ) {
    return this.service.useInvite(code, actorBaseId);
  }

  @Post('kick')
  @ApiOperation({
    summary: 'Kick a member',
    description:
      'Kicks a member from a server. Requires moderator or owner permissions.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'User successfully kicked.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (insufficient permissions).',
  })
  kickMember(
    @Body() dto: KickBanDto,
    @CurrentUser('userId') actorBaseId: string,
  ) {
    return this.service.kickOrBan(dto, 'kick', actorBaseId);
  }

  @Post('ban')
  @ApiOperation({
    summary: 'Ban a member',
    description:
      'Bans a member from a server. Requires moderator or owner permissions.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'User successfully banned.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (insufficient permissions).',
  })
  banMember(
    @Body() dto: KickBanDto,
    @CurrentUser('userId') actorBaseId: string,
  ) {
    return this.service.kickOrBan(dto, 'ban', actorBaseId);
  }

  @Post('unban')
  @ApiOperation({
    summary: 'Unban a member',
    description:
      'Unbans a previously banned member. Requires moderator or owner permissions.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'User successfully unbanned.' })
  @ApiResponse({ status: 404, description: 'Ban record not found.' })
  unbanMember(
    @Body() dto: UnbanDto,
    @CurrentUser('userId') actorBaseId: string,
  ) {
    return this.service.unbanMember(dto, actorBaseId);
  }

  @Patch('role')
  @ApiOperation({
    summary: 'Assign a role to a member',
    description: 'Changes role of member. Requires owner permissions.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Role updated successfully.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (only owner can assign roles).',
  })
  assignRole(
    @Body() dto: AssignRoleDto,
    @CurrentUser('userId') actorBaseId: string,
  ) {
    return this.service.assignRole(dto, actorBaseId);
  }

  @Patch('notification')
  @ApiOperation({
    summary: 'Update notification settings',
    description:
      'Mutes or unmutes notifications for a user in a specific server.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Notification settings updated.' })
  @ApiResponse({ status: 404, description: 'Membership not found.' })
  updateNotification(
    @Body() dto: UpdateNotificationDto,
    @CurrentUser('userId') actorBaseId: string,
  ) {
    return this.service.updateNotification(dto, actorBaseId);
  }

  @Post('create-profile')
  @ApiOperation({
    summary: 'Create Dehive profile for user',
    description:
      'Creates a Dehive profile for the authenticated user if it does not exist.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Dehive profile created successfully.',
  })
  @ApiResponse({ status: 200, description: 'Dehive profile already exists.' })
  createProfile(@CurrentUser('userId') userId: string) {
    return this.service.createUserDehiveProfile(userId);
  }

  @Get('user/:userId/profile')
  @Public()
  @ApiOperation({
    summary: 'Get a base user profile',
    description: 'Retrieves the basic, public profile of a user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'The Base User ID of the user to view',
  })
  @ApiResponse({ status: 200, description: 'Returns the base user profile.' })
  getUserProfile(@Param('userId') userId: string) {
    return this.service.getUserProfile(userId);
  }

  @Get('profile/enriched/target/:targetUserId')
  @ApiOperation({
    summary: 'Get an enriched user profile',
    description:
      'Retrieves a social user profile, including mutual servers, from the perspective of the viewer.',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiParam({
    name: 'targetUserId',
    description: 'The Base User ID of the profile to be viewed',
  })
  @ApiResponse({ status: 200, description: 'Returns the enriched profile.' })
  @ApiResponse({
    status: 404,
    description: 'Profile for target or viewer not found.',
  })
  getEnrichedUserProfile(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('userId') viewerUserId: string,
  ) {
    return this.service.getEnrichedUserProfile(targetUserId, viewerUserId);
  }
}
