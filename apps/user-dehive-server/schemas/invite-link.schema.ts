import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ collection: "invite_link", timestamps: true })
export class InviteLink {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: Types.ObjectId, required: true, ref: "Server" })
  server_id: Types.ObjectId;

  @Prop({ required: true })
  expiredAt: Date;

  @Prop({ type: Types.ObjectId, required: true, ref: "UserDehive" })
  creator_id: Types.ObjectId;

  @Prop({ default: false })
  isUsed: boolean;
}

export type InviteLinkDocument = InviteLink & Document;
export const InviteLinkSchema = SchemaFactory.createForClass(InviteLink);
