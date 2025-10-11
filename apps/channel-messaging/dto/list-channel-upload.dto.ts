import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { AttachmentType } from "../enum/enum";

export class ListUploadsDto {
  @ApiProperty({
    description: "Server ID for scoping and permission",
    example: "68db1234abcd5678efgh9013",
  })
  @IsMongoId()
  serverId: string;

  @ApiPropertyOptional({
    description: "Filter by attachment type",
    enum: AttachmentType,
  })
  @IsOptional()
  @IsEnum(AttachmentType)
  type?: AttachmentType;

  @ApiPropertyOptional({
    description: "Page number (starting at 1)",
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: "Items per page (max 100)",
    default: 30,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 30;
}
