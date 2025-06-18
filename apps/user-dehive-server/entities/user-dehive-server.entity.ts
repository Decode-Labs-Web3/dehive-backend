import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ServerRole {
  OWNER = 'owner',
  MODERATOR = 'moderator',
  MEMBER = 'member'
}

@Schema({ timestamps: true, collection: 'userdehiveservers' })
export class UserDehiveServer extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: true, index: true })
  user_dehive_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Server', required: true, index: true })
  server_id: Types.ObjectId;

  @Prop({ type: String, enum: ServerRole, default: ServerRole.MEMBER })
  role: ServerRole;

  @Prop({ default: false })
  is_banned: boolean;

  @Prop({ type: Date, default: Date.now })
  joined_at: Date;
}

export const UserDehiveServerSchema = SchemaFactory.createForClass(UserDehiveServer);
UserDehiveServerSchema.index({ user_dehive_id: 1, server_id: 1 }, { unique: true });