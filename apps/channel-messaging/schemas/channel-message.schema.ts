import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ collection: "channel_message", timestamps: true })
export class ChannelMessage {
  @Prop({ required: true, trim: true, maxlength: 2000 })
  content: string;

  @Prop({
    type: Types.ObjectId,
    ref: "UserDehive",
    required: true,
    index: true,
  })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Channel", required: true, index: true })
  channelId: Types.ObjectId;

  @Prop({ type: [{ type: Object }], default: [] })
  attachments: Record<string, unknown>[];

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ required: false })
  editedAt?: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: "ChannelMessage",
    required: false,
    default: null,
  })
  replyTo?: Types.ObjectId;
}

export type ChannelMessageDocument = ChannelMessage & Document;

export const ChannelMessageSchema =
  SchemaFactory.createForClass(ChannelMessage);

// ⭐ Compound Indexes để tăng tốc query
// Index chính: Sort theo channel + thời gian + ID (dùng cho pagination)
ChannelMessageSchema.index({ channelId: 1, createdAt: -1, _id: -1 });

// Index phụ: Filter theo channel + sender (dùng khi cần)
ChannelMessageSchema.index({ channelId: 1, senderId: 1 });

// Index time-based: Sort theo thời gian (dùng cho recent messages)
ChannelMessageSchema.index({ createdAt: -1 });
