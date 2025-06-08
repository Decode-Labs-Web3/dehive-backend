import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop()
  username: string;

  @Prop()
  display_name: string;

  @Prop()
  avatar_fallback_url: string;
}

export const UserSchema = SchemaFactory.createForClass(User);