import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ collection: "direct_upload", timestamps: true })
export class DirectUpload {
  @Prop({
    type: Types.ObjectId,
    ref: "UserDehive",
    required: true,
    index: true,
  })
  ownerId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "DirectConversation",
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({ required: true })
  type: string; // image|video|audio|file

  @Prop({ required: false })
  ipfsHash?: string;

  @Prop({ required: false, index: true })
  contentHash?: string; // sha256 hex of file content for dedupe across uploads

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

export type DirectUploadDocument = DirectUpload & Document;
export const DirectUploadSchema = SchemaFactory.createForClass(DirectUpload);
// index contentHash unique when present to avoid exact duplicates
DirectUploadSchema.index({ contentHash: 1 }, { unique: true, sparse: true });
