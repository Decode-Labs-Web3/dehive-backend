import { IsMongoId, IsBoolean } from 'class-validator';

export class UpdateNotificationDto {
  @IsMongoId()
  user_dehive_id: string;

  @IsMongoId()
  server_id: string;

  @IsBoolean()
  muted: boolean;
}