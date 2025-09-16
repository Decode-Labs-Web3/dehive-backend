import { IsMongoId, IsNotEmpty } from 'class-validator';
export class GenerateInviteDto {
  @IsNotEmpty() 
  @IsMongoId() 
  server_id: string;
  
  @IsNotEmpty() 
  @IsMongoId() 
  user_dehive_id: string;
}