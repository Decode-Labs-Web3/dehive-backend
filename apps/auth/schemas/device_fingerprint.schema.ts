import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, ObjectId } from 'mongoose';

@Schema()
export class DeviceFingerprint extends Document {
  @Prop({ required: true })
  user_id: ObjectId;

  @Prop({ required: true })
  fingerprint_hash: string;

  @Prop({ required: false })
  created_at: Date;

  @Prop({ required: true })
  is_trusted: boolean;
}

export const DeviceFingerprintSchema = SchemaFactory.createForClass(DeviceFingerprint);
