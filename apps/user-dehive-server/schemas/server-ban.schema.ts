import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ServerBan { 
  @Prop({ type: Types.ObjectId, ref: 'Server', required: true })
  server_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: true })
  user_dehive_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: true })
  banned_by: Types.ObjectId;

  @Prop({ required: false })
  reason: string;

  @Prop({ type: Date, required: false })
  expires_at: Date;
}

export type ServerBanDocument = ServerBan & Document
export const ServerBanSchema = SchemaFactory.createForClass(ServerBan);
ServerBanSchema.index({ server_id: 1, user_dehive_id: 1 }, { unique: true });