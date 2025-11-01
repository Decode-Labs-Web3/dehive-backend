import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ collection: "channel_upload", timestamps: true })
export class Upload {
  @Prop({
    type: Types.ObjectId,
    ref: "UserDehive",
    required: true,
    index: true,
  })
  ownerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Server", required: false, index: true })
  serverId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Channel", required: false, index: true })
  channelId?: Types.ObjectId;

  @Prop({ required: true })
  type: string; // image|video|audio|file

  @Prop({ required: false })
  ipfsHash?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  size: number; // bytes

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: false })
  width?: number;

  @Prop({ required: false })
  height?: number;

  @Prop({ required: false })
  durationMs?: number;
}

export type UploadDocument = Upload & Document;
export const UploadSchema = SchemaFactory.createForClass(Upload);
