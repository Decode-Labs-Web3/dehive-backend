import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'channelmessages', timestamps: true })
export class ChannelMessage {

  @Prop({ required: true, trim: true, maxlength: 2000 })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: true })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channel_id: Types.ObjectId;

  @Prop({ default: false })
  is_encrypted: boolean;

  @Prop({ type: [{ type: Object }], default: [] })
  attachments: Record<string, any>[];

  @Prop({ default: false })
  is_edited: boolean;
}

export type ChannelMessageDocument = ChannelMessage & Document;

export const ChannelMessageSchema = SchemaFactory.createForClass(ChannelMessage);