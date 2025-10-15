import { IsString, IsNotEmpty, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class StartCallDto {
  @ApiProperty({
    description: "ID of the user to call",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  @IsNotEmpty()
  target_user_id: string;

  @ApiProperty({
    description: "Whether to start with video enabled",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  with_video?: boolean = true;

  @ApiProperty({
    description: "Whether to start with audio enabled",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  with_audio?: boolean = true;
}
