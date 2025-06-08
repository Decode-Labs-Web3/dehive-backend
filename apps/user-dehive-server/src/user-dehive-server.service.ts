import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDehiveServer } from '../entities/user-dehive-server.entity';
import { JoinServerDto } from '../dto/join-server.dto';
import { LeaveServerDto } from '../dto/leave-server.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { EventProducerService } from '../kafka/event-producer.service';
import { InviteLinkCache } from '../redis/invite-link.cache';
import { NotificationCache } from '../redis/notification.cache';

@Injectable()
export class UserDehiveServerService {
  constructor(
    @InjectModel(UserDehiveServer.name) private userServerModel: Model<UserDehiveServer>,
    private readonly eventProducer: EventProducerService,
    private readonly inviteLinkCache: InviteLinkCache,
    private readonly notificationCache: NotificationCache,
  ) {}

  async joinServer(dto: JoinServerDto) {
    const exists = await this.userServerModel.findOne({ user_dehive_id: dto.user_dehive_id, server_id: dto.server_id });
    if (exists) throw new ForbiddenException('Already joined');
    const record = await this.userServerModel.create({ ...dto, joined_at: new Date() });
    await this.eventProducer.emit('server.joined', { userId: dto.user_dehive_id, serverId: dto.server_id });
    return record;
  }

  async leaveServer(dto: LeaveServerDto) {
    await this.userServerModel.deleteOne({ user_dehive_id: dto.user_dehive_id, server_id: dto.server_id });
    await this.eventProducer.emit('server.left', { userId: dto.user_dehive_id, serverId: dto.server_id });
    return { message: 'Left server' };
  }

  async generateInvite(dto: GenerateInviteDto) {
    const code = Math.random().toString(36).substring(2, 10);
    const expiredAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 ngày
    await this.inviteLinkCache.setInviteLink(dto.server_id, code, expiredAt);
    return { inviteLink: code, expiredAt };
  }

  async useInviteLink(code: string, user_dehive_id: string) {
    const server_id = await this.inviteLinkCache.getServerIdByInviteLink(code);
    if (!server_id) throw new NotFoundException('Invite link expired or invalid');
    return this.joinServer({ user_dehive_id, server_id });
  }

  async kickOrBan(dto: KickBanDto) {
    if (dto.action === 'kick') {
      await this.userServerModel.deleteOne({ user_dehive_id: dto.target_user_id, server_id: dto.server_id });
      await this.eventProducer.emit('server.kicked', { userId: dto.target_user_id, serverId: dto.server_id });
      return { message: 'User kicked' };
    } else if (dto.action === 'ban') {
      await this.userServerModel.updateOne(
        { user_dehive_id: dto.target_user_id, server_id: dto.server_id },
        { is_banned: true }
      );
      await this.eventProducer.emit('server.banned', { userId: dto.target_user_id, serverId: dto.server_id });
      return { message: 'User banned' };
    }
    throw new ForbiddenException('Invalid action');
  }

  async updateNotification(dto: UpdateNotificationDto) {
    await this.notificationCache.setNotificationPreference(dto.user_dehive_id, dto.server_id, dto.muted);
    return { message: 'Notification updated' };
  }
}