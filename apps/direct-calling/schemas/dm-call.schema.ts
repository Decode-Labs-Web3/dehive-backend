import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { CallStatus, CallEndReason } from "../enum/enum";

@Schema({ collection: "dm_calls", timestamps: true })
export class DmCall {
  @Prop({
    type: Types.ObjectId,
    ref: "DirectConversation",
    required: true,
    index: true,
  })
  conversation_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "UserDehive",
    required: true,
    index: true,
  })
  caller_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "UserDehive",
    required: true,
    index: true,
  })
  callee_id: Types.ObjectId;

  @Prop({
    type: String,
    enum: CallStatus,
    default: CallStatus.RINGING,
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

  @Prop({ default: true })
  caller_audio_enabled: boolean;

  @Prop({ default: true })
  caller_video_enabled: boolean;

  @Prop({ default: true })
  callee_audio_enabled: boolean;

  @Prop({ default: true })
  callee_video_enabled: boolean;

  @Prop({ required: false })
  caller_audio_muted?: boolean;

  @Prop({ required: false })
  caller_video_muted?: boolean;

  @Prop({ required: false })
  callee_audio_muted?: boolean;

  @Prop({ required: false })
  callee_video_muted?: boolean;

  @Prop({ required: false })
  caller_screen_share?: boolean;

  @Prop({ required: false })
  callee_screen_share?: boolean;

  @Prop({
    type: Object,
    required: false
  })
  connection_quality?: {
    caller: {
      audio_quality: number;
      video_quality: number;
      network_latency: number;
    };
    callee: {
      audio_quality: number;
      video_quality: number;
      network_latency: number;
    };
  };

  @Prop({
    type: Object,
    required: false
  })
  metadata?: Record<string, any>;
}

export type DmCallDocument = DmCall & Document;
export const DmCallSchema = SchemaFactory.createForClass(DmCall);

// Indexes for performance
DmCallSchema.index({ caller_id: 1, status: 1 });
DmCallSchema.index({ callee_id: 1, status: 1 });
DmCallSchema.index({ conversation_id: 1, created_at: -1 });
DmCallSchema.index({ status: 1, created_at: -1 });
