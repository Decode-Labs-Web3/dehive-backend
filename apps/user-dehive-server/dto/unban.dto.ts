import { IsNotEmpty, IsMongoId, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnbanDto {
  @ApiProperty({
    description: 'The ID of the server.',
    example: '68c5adb6ec465897d540c58',
  })
  @IsNotEmpty()
  @IsMongoId()
  server_id: string;

  @ApiProperty({
    description: 'The user_dehive_id of the user to unban.',
    example: '68c5adb6ec465897d540c58',
  })
  @IsNotEmpty()
  @IsMongoId()
  target_user_dehive_id: string;
}
