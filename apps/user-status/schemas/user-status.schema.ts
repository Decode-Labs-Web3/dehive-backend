import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type UserStatusDocument = UserStatusSchema & Document;

@Schema({ collection: "user_statuses", timestamps: true })
export class UserStatusSchema {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  user_id: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["online", "offline", "away"],
    default: "offline",
    index: true,
  })
  status: string;

  @Prop({ type: Date, default: Date.now, index: true })
  last_seen: Date;

  @Prop({ type: String, default: null })
  socket_id: string | null;

  @Prop({ type: Date, default: Date.now })
  updated_at: Date;
}

export const UserStatusModel = SchemaFactory.createForClass(UserStatusSchema);

// Create indexes for performance
UserStatusModel.index({ user_id: 1 });
UserStatusModel.index({ status: 1 });
UserStatusModel.index({ last_seen: -1 });
