import { IsEnum, IsMongoId, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ServerRole } from "../enum/enum";

export class AssignRoleDto {
  @ApiProperty({
    description: "The ID of the server.",
    example: "68c5adb6ec465897d540c58",
  })
  @IsNotEmpty()
  @IsMongoId()
  server_id: string;

  @ApiProperty({
    description: "The user_dehive_id of the target user to assign role.",
    example: "68c5adb6ec465897d540c58",
  })
  @IsNotEmpty()
  @IsMongoId()
  target_user_dehive_id: string;

  @ApiProperty({
    description: "The new role to assign.",
    enum: ServerRole,
    example: ServerRole.MODERATOR,
  })
  @IsNotEmpty()
  @IsEnum(ServerRole)
  role: ServerRole;
}
