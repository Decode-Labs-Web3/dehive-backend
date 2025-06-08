import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, ObjectId } from 'mongoose';

@Schema()
export class Session extends Document {
  @Prop({ required: true })
  user_id: ObjectId;

  @Prop({ required: true })
  device_fingerprint_id: ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expires_at: Date;

  @Prop({ required: true })
  created_at: Date;

}

export const SessionSchema = SchemaFactory.createForClass(Session);
