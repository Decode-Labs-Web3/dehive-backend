import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'userdehives', timestamps: true })
export class UserDehive {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user_id: Types.ObjectId;

  @Prop({ type: String, maxlength: 190, default: '' })
  bio: string;

  @Prop({ type: String, maxlength: 7, default: null })
  banner_color: string;

  @Prop({ type: Number, default: 0 })
  server_count: number;

  @Prop({ type: String, enum: ['online', 'offline', 'idle'], default: 'offline' })
  status: string;

  @Prop({ type: Date })
  last_login: Date;
}

export type UserDehiveDocument = UserDehive & Document;
export const UserDehiveSchema = SchemaFactory.createForClass(UserDehive);