import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ChannelCallStatus } from "../enum/enum";

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
    type: Types.ObjectId,
    ref: "Server",
    required: true,
    index: true,
  })
  server_id: Types.ObjectId;

  @Prop({
    type: String,
    enum: ChannelCallStatus,
    default: ChannelCallStatus.WAITING,
    index: true,
  })
  status: ChannelCallStatus;

  @Prop({ required: false })
  started_at?: Date;

  @Prop({ required: false })
  ended_at?: Date;

  @Prop({ required: false })
  duration_seconds?: number;

  @Prop({ type: Number, default: 0 })
  max_participants: number;

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
ChannelCallSchema.index({ server_id: 1, status: 1 });
ChannelCallSchema.index({ status: 1, created_at: -1 });
