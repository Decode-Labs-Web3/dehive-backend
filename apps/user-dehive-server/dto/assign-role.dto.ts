import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ServerRole } from '../enum/enum';

export class AssignRoleDto {
  @ApiProperty({
    description: 'The ID of the server.',
    example: '68c5adb6ec465897d540c58',
  })
  @IsNotEmpty()
  @IsMongoId()
  server_id: string;

  @ApiProperty({
    description: 'The session ID of the target user to assign role.',
    example: 'c7b3ae91-ca16-4c53-bb61-21eac681457d',
  })
  @IsNotEmpty()
  @IsString()
  target_session_id: string;

  @ApiProperty({
    description: 'The new role to assign.',
    enum: ServerRole,
    example: ServerRole.MODERATOR,
  })
  @IsNotEmpty()
  @IsEnum(ServerRole)
  role: ServerRole;
}
