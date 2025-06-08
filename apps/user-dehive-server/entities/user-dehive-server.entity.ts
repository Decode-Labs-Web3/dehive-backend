import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class UserDehiveServer extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: true })
  user_dehive_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Server', required: true })
  server_id: Types.ObjectId;

  @Prop({ default: false })
  is_muted: boolean;

  @Prop({ default: false })
  is_banned: boolean;

  @Prop({ default: Date.now })
  joined_at: Date;
}

export const UserDehiveServerSchema = SchemaFactory.createForClass(UserDehiveServer);