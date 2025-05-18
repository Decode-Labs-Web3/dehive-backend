import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, ObjectId } from 'mongoose';

@Schema()
export class DeviceFingerprint extends Document {
  @Prop({ required: true })
  user_id: ObjectId;

  @Prop({ required: true })
  hash_fingerprint: string;

  @Prop({ required: true })
  screen_resolution: string;

  @Prop({ required: true })
  user_agent: string;

  @Prop({ required: true })
  ip_address: string;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  created_at: Date;

  @Prop({ required: true })
  last_seen_at: Date;

  @Prop({ required: true })
  is_trusted: boolean;
}

export const DeviceFingerprintSchema = SchemaFactory.createForClass(DeviceFingerprint);
