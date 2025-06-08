import { IsMongoId } from 'class-validator';

export class JoinServerDto {
  @IsMongoId()
  user_dehive_id: string;

  @IsMongoId()
  server_id: string;
}