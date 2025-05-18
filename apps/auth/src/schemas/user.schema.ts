import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, ObjectId } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  display_name: string;

  @Prop({ required: true })
  bio: string;

  @Prop({ required: true })
  password_hashed: string;

  @Prop({ required: false })
  biography: string;

  @Prop({ required: false })
  primary_wallet: ObjectId;

  @Prop({ required: false })
  wallets: ObjectId[];

  @Prop({ required: true })
  last_login: Date;

  @Prop({ required: true })
  created_at: Date;

  @Prop({ required: true })
  updated_at: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
