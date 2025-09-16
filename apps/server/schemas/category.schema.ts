import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Category {

  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;


  @Prop({ type: Types.ObjectId, ref: 'Server', required: true })
  server_id: Types.ObjectId;


  @Prop({ type: Number, default: 0 })
  position: number;
}

export type CategoryDocument = Category & Document;

export const CategorySchema = SchemaFactory.createForClass(Category);