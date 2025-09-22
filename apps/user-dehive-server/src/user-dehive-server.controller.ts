import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Req,
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
import { FakeAuthGuard } from '../guards/fake-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Memberships & Profiles')
@Controller('memberships')
export class UserDehiveServerController {
  constructor(private readonly service: UserDehiveServerService) {}

  @Post('join')
  @ApiOperation({
    summary: 'Join a server',
    description: 'Allows a user to become a member of a server.',
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
  joinServer(@Body() dto: JoinServerDto) {
    return this.service.joinServer(dto);
  }

  @Delete('server/:serverId/user/:userDehiveId')
  @UseGuards(FakeAuthGuard)
  @ApiOperation({
    summary: 'Leave a server',
    description: 'Allows a user to leave a server they are a member of.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description:
      'The Base User ID of the user performing the action (for fake auth)',
    required: true,
  })
  @ApiParam({ name: 'serverId', description: 'The ID of the server to leave' })
  @ApiParam({
    name: 'userDehiveId',
    description: 'The Dehive Profile ID of the user leaving',
  })
  @ApiResponse({ status: 200, description: 'Successfully left the server.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (e.g., owner cannot leave).',
  })
  leaveServer(
    @Param('serverId') serverId: string,
    @Param('userDehiveId') userDehiveId: string,
  ) {
    const dto: LeaveServerDto = {
      server_id: serverId,
      user_dehive_id: userDehiveId,
    };
    return this.service.leaveServer(dto);
  }

  @Get('server/:serverId/members')
  @ApiOperation({
    summary: 'Get all members in a server',
    description: 'Retrieves a list of all members for a specific server.',
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
  @UseGuards(FakeAuthGuard)
  @ApiOperation({
    summary: 'Generate an invite link',
    description: 'Generates a new invite link for a server.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The Base User ID of the member creating the invite',
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
    @Req() req: AuthenticatedRequest,
  ) {
    const actorBaseId = req.user.id;
    return this.service.generateInvite(dto, actorBaseId);
  }

  @Post('invite/use/:code')
  @UseGuards(FakeAuthGuard)
  @ApiOperation({
    summary: 'Use an invite link',
    description: 'Allows a user to join a server using an invite code.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The Base User ID of the user joining',
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
  useInvite(@Param('code') code: string, @Req() req: AuthenticatedRequest) {
    const actorBaseId = req.user.id;
    return this.service.useInvite(code, actorBaseId);
  }

  @Post('kick')
  @UseGuards(FakeAuthGuard)
  @ApiOperation({
    summary: 'Kick a member',
    description:
      'Kicks a member from a server. Requires moderator or owner permissions.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The Base User ID of the moderator performing the action',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'User successfully kicked.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (insufficient permissions).',
  })
  kickMember(@Body() dto: KickBanDto, @Req() req: AuthenticatedRequest) {
    const actorBaseId = req.user.id;
    return this.service.kickOrBan(dto, 'kick', actorBaseId);
  }

  @Post('ban')
  @UseGuards(FakeAuthGuard)
  @ApiOperation({
    summary: 'Ban a member',
    description:
      'Bans a member from a server. Requires moderator or owner permissions.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The Base User ID of the moderator performing the action',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'User successfully banned.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (insufficient permissions).',
  })
  banMember(@Body() dto: KickBanDto, @Req() req: AuthenticatedRequest) {
    const actorBaseId = req.user.id;
    return this.service.kickOrBan(dto, 'ban', actorBaseId);
  }

  @Post('unban')
  @UseGuards(FakeAuthGuard)
  @ApiOperation({
    summary: 'Unban a member',
    description:
      'Unbans a previously banned member. Requires moderator or owner permissions.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The Base User ID of the moderator performing the action',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'User successfully unbanned.' })
  @ApiResponse({ status: 404, description: 'Ban record not found.' })
  unbanMember(@Body() dto: UnbanDto, @Req() req: AuthenticatedRequest) {
    const actorBaseId = req.user.id;
    return this.service.unbanMember(dto, actorBaseId);
  }

  @Patch('role')
  @UseGuards(FakeAuthGuard)
  @ApiOperation({
    summary: 'Assign a role to a member',
    description: 'Changes role of member. Requires owner permissions.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The Base User ID of the server owner',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Role updated successfully.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (only owner can assign roles).',
  })
  assignRole(@Body() dto: AssignRoleDto, @Req() req: AuthenticatedRequest) {
    const actorBaseId = req.user.id;
    return this.service.assignRole(dto, actorBaseId);
  }

  @Patch('notification')
  @UseGuards(FakeAuthGuard)
  @ApiOperation({
    summary: 'Update notification settings',
    description:
      'Mutes or unmutes notifications for a user in a specific server.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The Base User ID of the user updating settings',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Notification settings updated.' })
  @ApiResponse({ status: 404, description: 'Membership not found.' })
  updateNotification(
    @Body() dto: UpdateNotificationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorBaseId = req.user.id;
    return this.service.updateNotification(dto, actorBaseId);
  }

  @Get('user/:userId/profile')
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
  @UseGuards(FakeAuthGuard)
  @ApiOperation({
    summary: 'Get an enriched user profile',
    description:
      'Retrieves a social user profile, including mutual servers, from the perspective of the viewer.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The Base User ID of the user who is viewing the profile',
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
    @Req() req: AuthenticatedRequest,
  ) {
    const viewerUserId = req.user.id;
    return this.service.getEnrichedUserProfile(targetUserId, viewerUserId);
  }
}
