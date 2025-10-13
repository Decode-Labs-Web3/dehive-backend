import {
  IsString,
  IsNotEmpty,
  Length,
  IsEnum,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ChannelType } from "../enum/enum";

export class CreateChannelDto {
  @ApiProperty({
    description: "The name of the new channel.",
    example: "general-chat",
  })
  @IsString({ message: "Name must be a string." })
  @IsNotEmpty({ message: "Name cannot be empty." })
  @Length(1, 100, { message: "Name must be between 1 and 100 characters." })
  name: string;

  @ApiProperty({
    description: "The type of the channel.",
    enum: ChannelType,
    example: ChannelType.TEXT,
  })
  @IsEnum(ChannelType, { message: "Type must be either TEXT or VOICE." })
  @IsNotEmpty({ message: "Type cannot be empty." })
  type: ChannelType;

  @ApiProperty({
    description: "The topic of the channel (optional).",
    example: "General discussion for all members.",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1024, { message: "Topic must not exceed 1024 characters." })
  topic?: string;
}
