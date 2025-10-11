import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from "class-validator";
import { AttachmentType } from "../enum/enum";

export class AttachmentDto {
  @ApiProperty({ enum: AttachmentType })
  @IsEnum(AttachmentType)
  type: AttachmentType;

  @ApiProperty({ description: "Public URL to access the file" })
  @IsUrl()
  url: string;

  @ApiProperty({ description: "Original file name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "File size in bytes", example: 123456 })
  @IsInt()
  @Min(0)
  size: number;

  @ApiProperty({ description: "MIME type of the file", example: "image/jpeg" })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiPropertyOptional({ description: "Width in pixels (image/video)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ description: "Height in pixels (image/video)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({
    description: "Duration in milliseconds (audio/video)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @ApiPropertyOptional({ description: "Thumbnail/preview URL (image/video)" })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}
