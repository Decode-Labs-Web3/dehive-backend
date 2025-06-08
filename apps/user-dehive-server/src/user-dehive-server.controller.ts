import { Controller, Post, Body, UseGuards, Param, Patch } from '@nestjs/common';
import { UserDehiveServerService } from '../src/user-dehive-server.service';
import { JoinServerDto } from '../dto/join-server.dto';
import { LeaveServerDto } from '../dto/leave-server.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { IsServerOwnerGuard, IsMemberGuard } from '../strategies/guards';

@Controller('server')
export class UserDehiveServerController {
  constructor(private readonly service: UserDehiveServerService) {}

  @Post('join')
  @UseGuards(IsMemberGuard)
  join(@Body() dto: JoinServerDto) {
    return this.service.joinServer(dto);
  }

  @Post('leave')
  @UseGuards(IsMemberGuard)
  leave(@Body() dto: LeaveServerDto) {
    return this.service.leaveServer(dto);
  }

  @Post('generate-invite')
  @UseGuards(IsServerOwnerGuard)
  generateInvite(@Body() dto: GenerateInviteDto) {
    return this.service.generateInvite(dto);
  }

  @Post('use-invite/:code')
  useInvite(@Param('code') code: string, @Body('user_dehive_id') user_dehive_id: string) {
    return this.service.useInviteLink(code, user_dehive_id);
  }

  @Post('kick-ban')
  @UseGuards(IsServerOwnerGuard)
  kickOrBan(@Body() dto: KickBanDto) {
    return this.service.kickOrBan(dto);
  }

  @Patch('notification')
  @UseGuards(IsMemberGuard)
  updateNotification(@Body() dto: UpdateNotificationDto) {
    return this.service.updateNotification(dto);
  }
}