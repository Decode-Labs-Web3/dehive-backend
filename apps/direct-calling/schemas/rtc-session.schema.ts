import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ collection: "rtc_sessions", timestamps: true })
export class RtcSession {
  @Prop({
    type: Types.ObjectId,
    ref: "DmCall",
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

  @Prop({ required: true, unique: true, index: true })
  session_id: string;

  @Prop({ required: true })
  socket_id: string;

  @Prop({ required: false })
  offer?: string;

  @Prop({ required: false })
  answer?: string;

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

  @Prop({
    type: Object,
    required: false,
  })
  network_info?: {
    local_ip?: string;
    public_ip?: string;
    connection_type?: string;
    bandwidth?: number;
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

export type RtcSessionDocument = RtcSession & Document;
export const RtcSessionSchema = SchemaFactory.createForClass(RtcSession);

// Indexes for performance
RtcSessionSchema.index({ call_id: 1, user_id: 1 });
RtcSessionSchema.index({ session_id: 1 });
RtcSessionSchema.index({ socket_id: 1 });
RtcSessionSchema.index({ is_active: 1, last_activity: -1 });
RtcSessionSchema.index({ call_id: 1, is_active: 1 });
