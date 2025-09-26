import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'channelconversations', timestamps: true })
export class ChannelConversation {
  @Prop({
    type: Types.ObjectId,
    ref: 'Channel',
    required: true,
    unique: true,
    index: true,
  })
  channelId: Types.ObjectId;

  @Prop({ required: false })
  key_contract?: string;
}

export type ChannelConversationDocument = ChannelConversation & Document;
export const ChannelConversationSchema =
  SchemaFactory.createForClass(ChannelConversation);
