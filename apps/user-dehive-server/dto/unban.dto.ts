import { IsNotEmpty, IsMongoId } from 'class-validator';
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
    description: 'The Dehive Profile ID of the user to unban.',
    example: '68c14a75264e42f26828c52d',
  })
  @IsNotEmpty()
  @IsMongoId()
  target_user_id: string;
}
