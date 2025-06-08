import { IsMongoId } from 'class-validator';

export class InviteUserDto {
  @IsMongoId()
  inviter_id: string;

  @IsMongoId()
  invitee_id: string;

  @IsMongoId()
  server_id: string;
}