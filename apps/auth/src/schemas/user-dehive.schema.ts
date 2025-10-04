import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, ObjectId } from 'mongoose';

@Schema({
  collection: 'user_dehive',
  timestamps: true,
})
export class UserDehive extends Document {
  @Prop({
    type: String,
    enum: ['ADMIN', 'MODERATOR', 'USER'],
    default: 'USER',
  })
  dehive_role: string;

  @Prop({ type: String })
  role_subscription: ObjectId;

  @Prop({
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'BANNED'],
    default: 'ACTIVE',
  })
  status: string;

  @Prop({ type: Number, default: 0 })
  server_count: number;

  @Prop({ type: Date })
  last_login: Date;

  // Profile fields
  @Prop({ type: String, default: '' })
  bio: string;

  @Prop({ type: String })
  banner_color: string;

  // Banned fields - track which servers have banned this user
  @Prop({ type: Boolean, default: false })
  is_banned: boolean;

  @Prop({ type: [String], default: [] })
  banned_by_servers: string[];
}

export const UserDehiveSchema = SchemaFactory.createForClass(UserDehive);
