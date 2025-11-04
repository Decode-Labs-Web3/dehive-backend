import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ collection: "server", timestamps: true })
export class Server {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, required: true })
  owner_id: string;

  @Prop({ type: String, required: false })
  avatar_hash?: string;

  @Prop({ default: 0 })
  member_count: number;

  @Prop({ default: false })
  is_private: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export type ServerDocument = Server & Document;

export const ServerSchema = SchemaFactory.createForClass(Server);

// Ensure avatar_hash is included in toJSON and toObject
ServerSchema.set("toJSON", { virtuals: false });
ServerSchema.set("toObject", { virtuals: false });
