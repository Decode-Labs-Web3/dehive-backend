import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'direct_conversation', timestamps: true })
export class DirectConversation {
  @Prop({
    type: Types.ObjectId,
    ref: 'UserDehive',
    required: true,
    index: true,
  })
  userA: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'UserDehive',
    required: true,
    index: true,
  })
  userB: Types.ObjectId;

  @Prop({ required: false })
  is_encrypted?: boolean;
}

export type DirectConversationDocument = DirectConversation & Document;
export const DirectConversationSchema =
  SchemaFactory.createForClass(DirectConversation);

DirectConversationSchema.pre<DirectConversationDocument>(
  'save',
  function (next) {
    if (this.userA.toString() > this.userB.toString()) {
      const temp = this.userA;
      this.userA = this.userB;
      this.userB = temp;
    }
    next();
  },
);
DirectConversationSchema.index({ userA: 1, userB: 1 }, { unique: true });
