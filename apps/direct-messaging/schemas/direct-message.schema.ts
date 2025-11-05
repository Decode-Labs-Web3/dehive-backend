import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ collection: "direct_message", timestamps: true })
export class DirectMessage {
  @Prop({
    type: Types.ObjectId,
    ref: "DirectConversation",
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "UserDehive",
    required: true,
    index: true,
  })
  senderId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  content: string;

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
    ref: "DirectMessage",
    required: false,
    default: null,
  })
  replyTo?: Types.ObjectId;
}

export type DirectMessageDocument = DirectMessage & Document;
export const DirectMessageSchema = SchemaFactory.createForClass(DirectMessage);

// ⭐ Compound Indexes để tăng tốc query
// Index chính: Sort theo conversation + thời gian + ID (dùng cho pagination)
DirectMessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });

// Index phụ: Filter theo conversation + sender (dùng khi cần)
DirectMessageSchema.index({ conversationId: 1, senderId: 1 });

// Index time-based: Sort theo thời gian (dùng cho recent messages)
DirectMessageSchema.index({ createdAt: -1 });
