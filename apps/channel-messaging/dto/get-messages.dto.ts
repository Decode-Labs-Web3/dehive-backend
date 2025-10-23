import { IsNumber, IsOptional, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class GetMessagesParamsDto {}

export class GetMessagesDto {
  @ApiProperty({
    description: "The page number to retrieve, starting from 0.",
    default: 0,
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number = 0;

  @ApiProperty({
    description: "The number of messages to retrieve per page (max 100).",
    default: 10,
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
