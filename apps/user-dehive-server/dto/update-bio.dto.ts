import { IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateBioDto {
  @ApiProperty({
    description: "User's bio text",
    example:
      "Software developer passionate about creating amazing applications",
    maxLength: 500,
    required: true,
  })
  @IsString()
  @MaxLength(500, { message: "Bio cannot exceed 500 characters" })
  bio: string;
}
