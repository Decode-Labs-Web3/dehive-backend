import { IsMongoId, IsIn } from 'class-validator';

export class KickBanDto {
  @IsMongoId()
  server_id: string;

  @IsMongoId()
  target_user_id: string;

  @IsIn(['kick', 'ban'])
  action: 'kick' | 'ban';
}