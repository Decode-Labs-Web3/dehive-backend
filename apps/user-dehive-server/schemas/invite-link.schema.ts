import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class InviteLink extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Server' })
  server_id: Types.ObjectId;

  @Prop({ required: true })
  expiredAt: Date;

  @Prop({ type: Types.ObjectId, required: true, ref: 'UserDehive' })
  creator_id: Types.ObjectId;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const InviteLinkSchema = SchemaFactory.createForClass(InviteLink);
