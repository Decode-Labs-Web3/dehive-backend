import { Controller, Post, Body, Get, Param, Patch, Delete, Req, UseGuards } from '@nestjs/common';
import { UserDehiveServerService } from './user-dehive-server.service';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { JoinServerDto } from '../dto/join-server.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { LeaveServerDto } from '../dto/leave-server.dto';
import { UnbanDto } from '../dto/unban.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { UseInviteDto } from '../dto/use-invite.dto';
import { FakeAuthGuard } from '../guards/fake-auth.guard';

interface AuthenticatedRequest extends Request {
    user: { id: string; }; 
}

@Controller('memberships')
export class UserDehiveServerController {
    constructor(private readonly service: UserDehiveServerService) {}
    @Post('join')
    joinServer(@Body() dto: JoinServerDto) {
        return this.service.joinServer(dto);
    }


    @Delete('server/:serverId/user/:userDehiveId')
    @UseGuards(FakeAuthGuard) 
    leaveServer(
        @Param('serverId') serverId: string,
        @Param('userDehiveId') userDehiveId: string,
        @Req() req: AuthenticatedRequest
    ) {
        const dto: LeaveServerDto = { server_id: serverId, user_dehive_id: userDehiveId };
        return this.service.leaveServer(dto);
    }

    @Get('server/:serverId/members')
    getMembersInServer(@Param('serverId') serverId: string) {
        return this.service.getMembersInServer(serverId);
    }

    @Post('invite/generate')
    @UseGuards(FakeAuthGuard) 
    generateInvite(@Body() dto: GenerateInviteDto, @Req() req: AuthenticatedRequest) {
        const actorBaseId = req.user.id;
        return this.service.generateInvite(dto, actorBaseId);
    }

    @Post('invite/use/:code')
    @UseGuards(FakeAuthGuard) 
    useInvite(@Param('code') code: string, @Req() req: AuthenticatedRequest) {
        const actorBaseId = req.user.id;
        return this.service.useInvite(code, actorBaseId);
    }

    @Post('kick')
    @UseGuards(FakeAuthGuard) 
    kickMember(@Body() dto: KickBanDto, @Req() req: AuthenticatedRequest) {
        const actorBaseId = req.user.id;
        return this.service.kickOrBan(dto, 'kick', actorBaseId);
    }

    @Post('ban')
    @UseGuards(FakeAuthGuard) 
    banMember(@Body() dto: KickBanDto, @Req() req: AuthenticatedRequest) {
        const actorBaseId = req.user.id;
        return this.service.kickOrBan(dto, 'ban', actorBaseId);
    }
    
    @Post('unban')
    @UseGuards(FakeAuthGuard) 
    unbanMember(@Body() dto: UnbanDto, @Req() req: AuthenticatedRequest) {
        const actorBaseId = req.user.id;
        return this.service.unbanMember(dto, actorBaseId);
    }

    @Patch('role')
    @UseGuards(FakeAuthGuard) 
    assignRole(@Body() dto: AssignRoleDto, @Req() req: AuthenticatedRequest) {
        const actorBaseId = req.user.id;
        return this.service.assignRole(dto, actorBaseId);
    }

    @Patch('notification')
    @UseGuards(FakeAuthGuard)
    updateNotification(@Body() dto: UpdateNotificationDto, @Req() req: AuthenticatedRequest) {
        const actorBaseId = req.user.id;
        return this.service.updateNotification(dto, actorBaseId);
    }

    @Get('user/:userId/profile')
    getUserProfile(@Param('userId') userId: string) {
        return this.service.getUserProfile(userId);
    }

    @Get('profile/enriched/target/:targetUserId')
    @UseGuards(FakeAuthGuard) 
    getEnrichedUserProfile(@Param('targetUserId') targetUserId: string, @Req() req: AuthenticatedRequest){
        const viewerUserId = req.user.id;
        return this.service.getEnrichedUserProfile(targetUserId, viewerUserId);
    }
}