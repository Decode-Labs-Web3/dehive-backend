import { IsString, IsNotEmpty, Length, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateCategoryDto {
  @ApiProperty({
    description: "The new name for the category.",
    example: "💬 Community Channels",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;
}
