import { IsMongoId } from 'class-validator';

export class LeaveServerDto {
  @IsMongoId()
  user_dehive_id: string;

  @IsMongoId()
  server_id: string;
}