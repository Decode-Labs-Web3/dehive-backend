import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ collection: "channel_rtc_sessions", timestamps: true })
export class ChannelRtcSession {
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

  @Prop({ required: true, index: true })
  session_id: string;

  @Prop({ required: true })
  socket_id: string;

  @Prop({ type: [String], required: false })
  offers?: string[];

  @Prop({ type: [String], required: false })
  answers?: string[];

  @Prop({ type: [Object], required: false })
  ice_candidates?: Array<{
    candidate: string;
    sdpMLineIndex?: number;
    sdpMid?: string;
    timestamp: Date;
  }>;

  @Prop({ required: false })
  connection_state?: string;

  @Prop({
    type: Object,
    required: false,
  })
  media_state?: {
    audio_enabled: boolean;
    video_enabled: boolean;
    audio_muted: boolean;
    video_muted: boolean;
    screen_share: boolean;
  };

  @Prop({ required: false })
  last_activity?: Date;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ required: false })
  ended_at?: Date;

  @Prop({
    type: Object,
    required: false,
  })
  metadata?: Record<string, unknown>;
}

export type ChannelRtcSessionDocument = ChannelRtcSession & Document;
export const ChannelRtcSessionSchema =
  SchemaFactory.createForClass(ChannelRtcSession);

// Indexes
ChannelRtcSessionSchema.index({ call_id: 1, user_id: 1 });
ChannelRtcSessionSchema.index({ session_id: 1 });
ChannelRtcSessionSchema.index({ socket_id: 1 });
ChannelRtcSessionSchema.index({ is_active: 1, last_activity: -1 });
ChannelRtcSessionSchema.index({ call_id: 1, is_active: 1 });
