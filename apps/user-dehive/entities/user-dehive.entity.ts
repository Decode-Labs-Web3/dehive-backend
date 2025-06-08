import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { DehiveRole, Status } from '../constants/enum';

@Schema()
export class UserDehive extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user_id: mongoose.Types.ObjectId;

  @Prop({ enum: DehiveRole })
  dehive_role: DehiveRole;

  @Prop({ enum: Status })
  status: Status;

  @Prop()
  server_count: number;

  @Prop({ type: [mongoose.Schema.Types.ObjectId] })
  server_id: mongoose.Types.ObjectId[];

  @Prop()
  last_login: Date;

  @Prop({ default: Date.now })
  created_at: Date;

  @Prop({ default: Date.now })
  updated_at: Date;
}

export const UserDehiveSchema = SchemaFactory.createForClass(UserDehive);