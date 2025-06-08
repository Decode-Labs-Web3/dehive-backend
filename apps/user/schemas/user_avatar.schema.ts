import { Schema } from "@nestjs/mongoose";
import { Prop, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from 'mongoose';

@Schema()
export class UserAvatar extends Document {
  @Prop({ required: true })
  user_id: ObjectId;

  @Prop({ required: true })
  ipfs_hash: string;

  @Prop({ required: true })
  fallback_url: string;

  @Prop({ required: true })
  createdAt: Date;
}

export const UserAvatarSchema = SchemaFactory.createForClass(UserAvatar);
