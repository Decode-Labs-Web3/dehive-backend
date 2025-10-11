import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsMongoId,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateChannelDto {
  @ApiProperty({
    description: "The new name for the channel.",
    example: "welcome-and-rules",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;

  @ApiProperty({
    description: "The new topic for the channel.",
    example: "Please read the rules before posting!",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1024)
  topic?: string;

  @ApiProperty({
    description: "The ID of the new category to move this channel to.",
    example: "68c40af9dfffdf7ae4af2e8c",
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  category_id?: string;
}
