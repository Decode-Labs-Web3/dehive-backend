import { IsString, IsNotEmpty, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class JoinCallDto {
  @ApiProperty({
    description: "ID of the channel to join call",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  @IsNotEmpty()
  channel_id: string;

  @ApiProperty({
    description: "Whether to join with video enabled",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  with_video?: boolean = false;

  @ApiProperty({
    description: "Whether to join with audio enabled",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  with_audio?: boolean = true;
}
