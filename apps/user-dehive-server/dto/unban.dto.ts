import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';
export class UnbanDto {
  @IsNotEmpty() @IsMongoId() server_id: string;
  @IsNotEmpty() @IsMongoId() target_user_id: string;
}