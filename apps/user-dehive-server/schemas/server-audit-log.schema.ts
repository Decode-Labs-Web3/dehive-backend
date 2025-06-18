import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AuditLogAction {
  MEMBER_JOIN = 'member_join',
  MEMBER_LEAVE = 'member_leave',
  MEMBER_KICK = 'member_kick',
  MEMBER_BAN = 'member_ban',
  MEMBER_UNBAN = 'member_unban',
  INVITE_CREATE = 'invite_create',
  INVITE_DELETE = 'invite_delete',
  ROLE_UPDATE = 'role_update',
  SERVER_UPDATE = 'server_update'
}

@Schema({ timestamps: true })
export class ServerAuditLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Server', required: true })
  server_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: true })
  actor_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: false })
  target_id?: Types.ObjectId;

  @Prop({ type: String, enum: AuditLogAction, required: true })
  action: AuditLogAction;

  @Prop({ type: Object, required: false })
  changes?: Record<string, any>;

  @Prop({ required: false })
  reason?: string;

  @Prop({ default: Date.now })
  created_at: Date;
}

export const ServerAuditLogSchema = SchemaFactory.createForClass(ServerAuditLog);
