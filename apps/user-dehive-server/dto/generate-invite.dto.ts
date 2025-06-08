import { IsMongoId } from 'class-validator';

export class GenerateInviteDto {
  @IsMongoId()
  server_id: string;

  @IsMongoId()
  creator_id: string;
}