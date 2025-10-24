import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ collection: "channel_participants", timestamps: true })
export class ChannelParticipant {
  @Prop({
    type: Types.ObjectId,
    ref: "ChannelCall",
    required: true,
    index: true,
  })
  channel_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "UserDehive",
    required: true,
    index: true,
  })
  user_id: Types.ObjectId;

  @Prop({ required: false })
  joined_at?: Date;

  @Prop({ required: false })
  left_at?: Date;

  @Prop({ required: false })
  duration_seconds?: number;

  @Prop({ type: String, required: false })
  socket_id?: string;

  @Prop({
    type: Object,
    required: false,
  })
  metadata?: Record<string, unknown>;
}

export type ChannelParticipantDocument = ChannelParticipant & Document;
export const ChannelParticipantSchema =
  SchemaFactory.createForClass(ChannelParticipant);

// Indexes
ChannelParticipantSchema.index({ channel_id: 1, user_id: 1 });
ChannelParticipantSchema.index({ socket_id: 1 });
