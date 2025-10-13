import { IsString, IsNotEmpty, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateDisplayNameDto {
  @ApiProperty({
    description: "User's display name",
    example: "Son Nguyen",
    minLength: 1,
    maxLength: 50,
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: "Display name is required" })
  @MinLength(1, { message: "Display name must be at least 1 character" })
  @MaxLength(50, { message: "Display name cannot exceed 50 characters" })
  display_name: string;
}
