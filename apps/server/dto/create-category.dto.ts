import { IsString, IsNotEmpty, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({
    description: "The name of the new category.",
    example: "General Channels",
  })
  @IsString({ message: "Name must be a string." })
  @IsNotEmpty({ message: "Name cannot be empty." })
  @Length(1, 100, { message: "Name must be between 1 and 100 characters." })
  name: string;
}
