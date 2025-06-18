import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ServerRole {
  OWNER = 'owner',
  MODERATOR = 'moderator', 
  MEMBER = 'member'
}

@Schema({ timestamps: true })
export class ServerMemberRole extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Server', required: true })
  server_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: true })
  user_dehive_id: Types.ObjectId;

  @Prop({ type: String, enum: ServerRole, default: ServerRole.MEMBER })
  role: ServerRole;

  @Prop({ default: Date.now })
  assigned_at: Date;
}

export const ServerMemberRoleSchema = SchemaFactory.createForClass(ServerMemberRole);
