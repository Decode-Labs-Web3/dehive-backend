import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, ObjectId } from 'mongoose';

@Schema({
  collection: 'user_dehive',
  timestamps: true,
})
export class UserDehive extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  user_id: ObjectId; // User Id from decode

  @Prop({ 
    type: String,
    enum: ['ADMIN', 'MODERATOR', 'USER'],
    default: 'USER'
  })
  dehive_role: string;

  @Prop({ type: String })
  role_subscription: ObjectId;

  @Prop({
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'BANNED'],
    default: 'ACTIVE'
  })
  status: string;

  @Prop({ type: Number, default: 0 })
  server_count: number;

  @Prop({ type: [String] })
  server_id: ObjectId[];

  @Prop({ type: Date })
  last_login: Date;
}

export const UserDehiveSchema = SchemaFactory.createForClass(UserDehive);