import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KickBanDto {
  @ApiProperty({
    description: 'The ID of the server.',
    example: '68c5adb6ec465897d540c58',
  })
  @IsNotEmpty()
  @IsMongoId()
  server_id: string;

  @ApiProperty({
    description: 'The session ID of the target user to kick/ban.',
    example: 'c7b3ae91-ca16-4c53-bb61-21eac681457d',
  })
  @IsNotEmpty()
  @IsString()
  target_session_id: string;

  @ApiProperty({
    description: 'The reason for the action (optional).',
    example: 'Breaking rule #3.',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
