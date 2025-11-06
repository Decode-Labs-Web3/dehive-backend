import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { AttachmentType } from "../enum/enum";

export class ListDirectUploadsDto {
  @ApiPropertyOptional({
    description: "Filter uploads by conversation ID",
    type: String,
    example: "507f1f77bcf86cd799439011",
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    description: "Filter uploads by a specific type.",
    enum: AttachmentType,
    example: "image",
  })
  @IsOptional()
  @IsEnum(AttachmentType)
  type?: AttachmentType;

  @ApiPropertyOptional({
    description: "The page number to retrieve, starting from 0",
    default: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page = 0;

  @ApiPropertyOptional({
    description: "The number of uploads to retrieve per page (max 100)",
    default: 10,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 10;
}
