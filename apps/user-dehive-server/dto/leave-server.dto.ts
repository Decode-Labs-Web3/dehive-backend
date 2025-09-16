import { IsMongoId, IsNotEmpty } from 'class-validator';
export class LeaveServerDto {
  @IsNotEmpty() @IsMongoId() user_dehive_id: string;
  @IsNotEmpty() @IsMongoId() server_id: string;
}