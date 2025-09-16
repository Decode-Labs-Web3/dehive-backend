import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true }) 
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: false })
  display_name: string;

  @Prop({ required: true, select: false })
  password_hashed: string;

  @Prop({ required: false, maxlength: 500 })
  bio: string;

  @Prop({ type: Types.ObjectId, required: false })
  primary_wallet: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId }], default: [] })
  wallets: Types.ObjectId[];

  @Prop({ default: false })
  email_verified: boolean;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ type: Types.ObjectId, required: false })
  mfa_id: Types.ObjectId;

  @Prop({ required: false })
  last_login: Date;

}
export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);