import { IsString, IsNotEmpty, IsIn, IsOptional, IsDate } from 'class-validator';

export class KickBanDto {
  @IsNotEmpty()
  @IsString()
  server_id: string;

  @IsNotEmpty()
  @IsString()
  target_user_id: string;

  @IsNotEmpty()
  @IsString()
  moderator_id: string;

  @IsIn(['kick', 'ban'])
  action: 'kick' | 'ban';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDate()
  expires_at?: Date;
}