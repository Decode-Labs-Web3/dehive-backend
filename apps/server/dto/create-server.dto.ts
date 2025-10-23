import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
  IsEnum,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ServerTag } from "../enum/enum";

export class CreateServerDto {
  @ApiProperty({
    description: "The name of the new server.",
    example: "My Awesome Community",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string;

  @ApiProperty({
    description: "A brief description of the server (optional).",
    example: "A place to hang out and chat.",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  readonly description?: string;

  @ApiProperty({
    description:
      "Tags for the server (optional). If not provided, will be empty array.",
    example: ["gaming", "friends"],
    required: false,
    enum: ServerTag,
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  @IsEnum(ServerTag, { each: true })
  readonly tags?: ServerTag[];
}
