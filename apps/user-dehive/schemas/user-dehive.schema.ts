import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { Status } from '../constants/enum';

@Schema({ timestamps: true })
export class UserDehive extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user_id: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'RoleSubscription' })
  role_subscription: mongoose.Types.ObjectId;

  @Prop({ type: String, enum: Status, default: Status.Offline })
  status: Status;

  @Prop({ default: 0 })
  server_count: number;

  @Prop({
    type: [{
      server_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Server' },
      role: { type: String, enum: ['owner', 'moderator', 'member'], default: 'member' }
    }],
    default: []
  })
  servers: { server_id: mongoose.Types.ObjectId; role: string }[];

  @Prop({ type: Date, default: Date.now })
  last_login: Date;

  @Prop({ type: Date, default: Date.now })
  created_at: Date;

  @Prop({ type: Date, default: Date.now })
  updated_at: Date;
}

export const UserDehiveSchema = SchemaFactory.createForClass(UserDehive);