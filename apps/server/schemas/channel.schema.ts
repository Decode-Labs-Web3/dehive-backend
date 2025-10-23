import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ChannelType } from "../enum/enum";

@Schema({ collection: "channel", timestamps: true })
export class Channel {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ type: String, enum: ChannelType, required: true })
  type: ChannelType;

  @Prop({ type: Types.ObjectId, ref: "Category", required: true })
  category_id: Types.ObjectId;

  @Prop({ type: String, maxlength: 1024 })
  topic: string;
}

export type ChannelDocument = Channel & Document;

export const ChannelSchema = SchemaFactory.createForClass(Channel);
