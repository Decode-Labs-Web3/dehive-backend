import { 
    Controller, 
    Post, 
    Body, 
    UseGuards, 
    Param, 
    Patch, 
    Delete, 
    Get, 
    ValidationPipe, 
    Request, 
    NotFoundException,
    InternalServerErrorException 
} from '@nestjs/common';
import { UserDehiveServerService } from './user-dehive-server.service';
import { Types } from 'mongoose';
import { JoinServerDto } from '../dto/join-server.dto';
import { LeaveServerDto } from '../dto/leave-server.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { IsServerOwnerGuard, IsMemberGuard, IsModeratorGuard } from '../strategies/guards';
import { UseInviteDto } from '../dto/use-invite.dto';
import { UnbanDto } from '../dto/unban.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { ServerRole } from '../entities/user-dehive-server.entity';

@Controller('server')
export class UserDehiveServerController {
    constructor(private readonly service: UserDehiveServerService) {}

    @Post('join')
    async join(@Body(ValidationPipe) dto: JoinServerDto) {
        try {
            return await this.service.joinServer(dto);
        } catch (error) {
            console.error('Join server error:', error);
            throw error;
        }
    }

    @Delete('member/:userDehiveId')
    @UseGuards(IsMemberGuard)
    async leave(
        @Param('userDehiveId') userDehiveId: string,
        @Body('server_id') serverId: string
    ) {
        const dto: LeaveServerDto = {
            server_id: new Types.ObjectId(serverId),
            user_dehive_id: new Types.ObjectId(userDehiveId)
        };
        return this.service.leaveServer(dto);
    }

    @Post('generate-invite')
    @UseGuards(IsMemberGuard)
    async generateInvite(@Body(ValidationPipe) dto: GenerateInviteDto) {
        try {
            return await this.service.generateInvite(dto);
        } catch (error) {
            console.error('Generate invite error:', error);
            throw error;
        }
    }

    @Post('use-invite/:code')
    async useInvite(
        @Param('code') code: string,
        @Body(ValidationPipe) dto: UseInviteDto
    ) {
        try {
            return await this.service.useInviteLink(code, dto.user_dehive_id);
        } catch (error) {
            console.error('Use invite error:', error);
            throw error;
        }
    }

    @Post('kick-ban')
    @UseGuards(IsModeratorGuard)
    async kickOrBan(@Body(ValidationPipe) dto: KickBanDto) {
        try {
            return await this.service.kickOrBan(dto);
        } catch (error) {
            console.error('Kick/ban error:', error);
            throw error;
        }
    }

    @Patch('notification')
    @UseGuards(IsMemberGuard)
    async updateNotification(@Body(ValidationPipe) dto: UpdateNotificationDto) {
        try {
            return await this.service.updateNotification(dto);
        } catch (error) {
            console.error('Update notification error:', error);
            throw error;
        }
    }

    @Post('unban')
    @UseGuards(IsModeratorGuard)
    async unban(@Body(ValidationPipe) dto: UnbanDto) {
        try {
            return await this.service.unban(dto);
        } catch (error) {
            console.error('Unban error:', error);
            throw error;
        }
    }

    @Patch('role')
    @UseGuards(IsModeratorGuard)
    async assignRole(
        @Body(ValidationPipe) dto: AssignRoleDto,
        @Request() req
    ) {
        try {
            return await this.service.updateMemberRole(
                new Types.ObjectId(dto.server_id),
                new Types.ObjectId(dto.target_user_id),
                dto.role as ServerRole,
                new Types.ObjectId(req.user.id)
            );
        } catch (error) {
            console.error('Assign role error:', error);
            throw error;
        }
    }

    @Get('member/:userId')
    @UseGuards(IsMemberGuard)
    async getMember(@Param('userId') userId: string) {
        try {
            const serverMemberships = await this.service.getMemberServers(new Types.ObjectId(userId));
            
            if (!serverMemberships) {
                throw new NotFoundException('User not found');
            }

            return {
                servers: serverMemberships.servers || []
            };
        } catch (error) {
            console.error('Get member error:', error);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to get member information');
        }
    }
}