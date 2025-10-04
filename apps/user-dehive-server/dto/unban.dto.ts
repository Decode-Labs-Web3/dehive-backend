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
    description: 'The session ID of the user to unban.',
    example: 'c7b3ae91-ca16-4c53-bb61-21eac681457d',
  })
  @IsNotEmpty()
  @IsString()
  target_session_id: string;
}
