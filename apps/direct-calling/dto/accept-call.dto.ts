import { IsString, IsNotEmpty, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AcceptCallDto {
  @ApiProperty({
    description: "ID of the call to accept",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  @IsNotEmpty()
  call_id: string;

  @ApiProperty({
    description: "Whether to accept with video enabled",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  with_video?: boolean = true;

  @ApiProperty({
    description: "Whether to accept with audio enabled",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  with_audio?: boolean = true;
}
