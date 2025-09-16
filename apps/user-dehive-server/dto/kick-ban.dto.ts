import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';
export class KickBanDto {
  @IsNotEmpty() @IsMongoId() server_id: string;
  @IsNotEmpty() @IsMongoId() target_user_id: string; 
  @IsOptional() @IsString() reason?: string;
}