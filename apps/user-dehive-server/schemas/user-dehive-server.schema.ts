import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ServerRole {
  OWNER = 'owner',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

@Schema({ collection: 'userdehiveservers', timestamps: true })
export class UserDehiveServer {

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user_id: Types.ObjectId;


  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: true, index: true })
  user_dehive_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Server', required: true, index: true })
  server_id: Types.ObjectId;

  @Prop({ type: String, enum: ServerRole, default: ServerRole.MEMBER })
  role: ServerRole;

  @Prop({ default: false })
  is_muted: boolean;

  @Prop({ default: false })
  is_banned: boolean;

  @Prop({ default: Date.now })
  joined_at: Date;
}

export type UserDehiveServerDocument = UserDehiveServer & Document;

export const UserDehiveServerSchema = SchemaFactory.createForClass(UserDehiveServer);

UserDehiveServerSchema.index({ user_dehive_id: 1, server_id: 1 }, { unique: true });