import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ServerRole } from '../constants/enum';

export class AssignRoleDto {
  @ApiProperty({
    description: 'The ID of the server.',
    example: '68c5adb6ec465897d540c58',
  })
  @IsNotEmpty()
  @IsMongoId()
  server_id: string;

  @ApiProperty({
    description: 'The Dehive Profile ID of the target user.',
    example: '68c14a75264e42f26828c52d',
  })
  @IsNotEmpty()
  @IsMongoId()
  target_user_id: string;

  @ApiProperty({
    description: 'The new role to assign.',
    enum: ServerRole,
    example: ServerRole.MODERATOR,
  })
  @IsNotEmpty()
  @IsEnum(ServerRole)
  role: ServerRole;
}
