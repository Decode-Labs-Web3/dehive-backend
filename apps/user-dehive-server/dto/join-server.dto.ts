import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinServerDto {
  @ApiProperty({
    description: 'The Dehive Profile ID of the user joining.',
    example: '68c14a75264e42f26828c52d',
  })
  @IsNotEmpty()
  @IsMongoId()
  user_dehive_id: string;

  @ApiProperty({
    description: 'The ID of the server to join.',
    example: '68c5adb6ec465897d540c58',
  })
  @IsNotEmpty()
  @IsMongoId()
  server_id: string;
}
