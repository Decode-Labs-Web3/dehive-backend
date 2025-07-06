import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { UserDehive } from 'apps/user-dehive/schemas/user-dehive.schema';
import { Document, ObjectId } from 'mongoose';

@Schema({
  collection: 'direct_conversation',
  timestamps: true,
})
export class DirectConversation extends Document {
  @Prop({ type: ObjectId, required: true, index: true })
  user_dehive_id_A: ObjectId;

  @Prop({ type: ObjectId, required: true, index: true })
  user_dehive_id_B: ObjectId;

  @Prop({ type: Boolean, default: false })
  is_encrypted: boolean;
}

export const UserDehiveSchema = SchemaFactory.createForClass(UserDehive);