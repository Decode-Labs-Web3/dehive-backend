import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { NftGatingConfig } from "../../server/interfaces/nft-gating.interface";

@Schema({ collection: "server", timestamps: true })
export class Server {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: "UserDehive", required: true })
  owner_id: Types.ObjectId;

  @Prop({ default: 0 })
  member_count: number;

  @Prop({ default: false })
  is_private: boolean;

  @Prop({ default: [] })
  tags: string[];

  @Prop({
    type: Object,
    required: false,
    default: null,
  })
  nft_gated?: NftGatingConfig;
}

export type ServerDocument = Server & Document;
export const ServerSchema = SchemaFactory.createForClass(Server);
