import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, ObjectId } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: false })
  display_name: string;

  @Prop({ required: true })
  password_hashed: string;

  @Prop({ required: false })
  biography: string;

  @Prop({ required: false, default: 'bafkreibmridohwxgfwdrju5ixnw26awr22keihoegdn76yymilgsqyx4le' })
  avatar_ipfs_hash: string;

  @Prop({ required: false, default: 'https://res.cloudinary.com/dfzu1b238/image/upload/v1748419831/default_user_icon_rt4zcm.png' })
  avatar_fallback_url: string;

  @Prop({ required: false })
  primary_wallet: ObjectId;

  @Prop({ required: false })
  wallets: ObjectId[];

  @Prop({ required: false })
  email_verified: boolean;

  @Prop({ required: false, default: 'user' })
  role: string;

  @Prop({ required: false })
  mfa_id: ObjectId;

  @Prop({ required: false })
  last_login: Date;

  @Prop({ required: true })
  created_at: Date;

  @Prop({ required: true })
  updated_at: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
