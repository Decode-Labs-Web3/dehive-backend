import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ParticipantStatus } from "../enum/enum";

@Schema({ collection: "channel_participants", timestamps: true })
export class ChannelParticipant {
  @Prop({
    type: Types.ObjectId,
    ref: "ChannelCall",
    required: true,
    index: true,
  })
  call_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "UserDehive",
    required: true,
    index: true,
  })
  user_id: Types.ObjectId;

  @Prop({
    type: String,
    enum: ParticipantStatus,
    default: ParticipantStatus.JOINING,
    index: true,
  })
  status: ParticipantStatus;

  @Prop({ required: false })
  joined_at?: Date;

  @Prop({ required: false })
  left_at?: Date;

  @Prop({ required: false })
  duration_seconds?: number;

  @Prop({ default: true })
  audio_enabled: boolean;

  @Prop({ default: false })
  video_enabled: boolean;

  @Prop({ default: false })
  audio_muted: boolean;

  @Prop({ default: false })
  video_muted: boolean;

  @Prop({ default: false })
  screen_sharing: boolean;

  @Prop({ type: String, required: false })
  socket_id?: string;

  @Prop({
    type: Object,
    required: false,
  })
  connection_quality?: {
    audio_quality: number;
    video_quality: number;
    network_latency: number;
  };

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
ChannelParticipantSchema.index({ call_id: 1, user_id: 1 });
ChannelParticipantSchema.index({ call_id: 1, status: 1 });
ChannelParticipantSchema.index({ user_id: 1, status: 1 });
ChannelParticipantSchema.index({ socket_id: 1 });
