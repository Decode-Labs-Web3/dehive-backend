import { IsMongoId, IsNotEmpty } from 'class-validator';

export class JoinServerDto {
  @IsNotEmpty()
  @IsMongoId({ message: 'user_dehive_id must be a valid MongoDB ObjectId' })
  user_dehive_id: string; 

  @IsNotEmpty()
  @IsMongoId({ message: 'server_id must be a valid MongoDB ObjectId' })
  server_id: string; 
}