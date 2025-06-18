import { IsMongoId } from 'class-validator';
import { Transform } from 'class-transformer';
import { Types } from 'mongoose';

export class LeaveServerDto {
  @IsMongoId()
  @Transform(({ value }) => new Types.ObjectId(value))
  user_dehive_id: Types.ObjectId;

  @IsMongoId()
  @Transform(({ value }) => new Types.ObjectId(value))
  server_id: Types.ObjectId;
}