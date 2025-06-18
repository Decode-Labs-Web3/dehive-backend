import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class UnbanDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  server_id: string;

  @IsNotEmpty()
  @IsString()
  target_user_id: string;

  @IsNotEmpty()
  @IsString()
  moderator_id: string;

  @IsString()
  reason?: string;
}
