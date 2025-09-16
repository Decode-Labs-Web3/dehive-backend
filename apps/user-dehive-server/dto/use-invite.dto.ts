import { IsMongoId, IsNotEmpty } from 'class-validator';
export class UseInviteDto {
  @IsNotEmpty()
  @IsMongoId()
  user_dehive_id: string;
}