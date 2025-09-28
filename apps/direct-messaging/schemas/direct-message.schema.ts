import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'directmessages', timestamps: true })
export class DirectMessage {
  @Prop({
    type: Types.ObjectId,
    ref: 'DirectConversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'UserDehive',
    required: true,
    index: true,
  })
  senderId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  content: string;

  @Prop({ type: [{ type: Object }], default: [] })
  attachments: Record<string, any>[];

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ required: false })
  editedAt?: Date;

  @Prop({ default: false })
  isDeleted: boolean;
}

export type DirectMessageDocument = DirectMessage & Document;
export const DirectMessageSchema = SchemaFactory.createForClass(DirectMessage);
