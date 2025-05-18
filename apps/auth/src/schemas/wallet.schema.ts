import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, ObjectId } from 'mongoose';

@Schema()
export class Wallet extends Document {
  @Prop({ required: true })
  address: string;

  @Prop({ required: false })
  name_service: string;

  @Prop({ required: true })
  created_at: Date;

  @Prop({ required: true })
  updated_at: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
