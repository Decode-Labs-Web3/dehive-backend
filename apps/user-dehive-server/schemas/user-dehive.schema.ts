import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Status } from '../enum/enum';

@Schema({ collection: 'user_dehive', timestamps: true })
export class UserDehive {
  @Prop({ type: String, required: true, unique: true })
  user_id: string;

  @Prop({ type: String, maxlength: 190, default: '' })
  bio: string;

  @Prop({ type: String, maxlength: 7, default: null })
  banner_color: string;

  @Prop({ type: Number, default: 0 })
  server_count: number;

  @Prop({
    type: String,
    enum: Status,
    default: 'offline',
  })
  status: string;

  @Prop({ type: Date })
  last_login: Date;
}

export type UserDehiveDocument = UserDehive & Document;
export const UserDehiveSchema = SchemaFactory.createForClass(UserDehive);
