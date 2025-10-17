import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { CallStatus, CallEndReason } from "../enum/enum";

@Schema({ collection: "channel_calls", timestamps: true })
export class ChannelCall {
  @Prop({
    type: Types.ObjectId,
    ref: "Channel",
    required: true,
    index: true,
  })
  channel_id: Types.ObjectId;

  @Prop({
    type: String,
    enum: CallStatus,
    default: CallStatus.CONNECTED,
    index: true,
  })
  status: CallStatus;

  @Prop({
    type: String,
    enum: CallEndReason,
    required: false,
  })
  end_reason?: CallEndReason;

  @Prop({ required: false })
  started_at?: Date;

  @Prop({ required: false })
  ended_at?: Date;

  @Prop({ required: false })
  duration_seconds?: number;

  @Prop({ type: Number, default: 0 })
  current_participants: number;

  @Prop({
    type: Object,
    required: false,
  })
  metadata?: Record<string, unknown>;
}

export type ChannelCallDocument = ChannelCall & Document;
export const ChannelCallSchema = SchemaFactory.createForClass(ChannelCall);

// Indexes
ChannelCallSchema.index({ channel_id: 1, status: 1 });
ChannelCallSchema.index({ status: 1, createdAt: -1 });
