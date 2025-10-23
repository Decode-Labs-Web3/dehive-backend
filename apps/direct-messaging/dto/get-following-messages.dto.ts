import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

export class GetFollowingMessagesDto {
  @ApiProperty({
    description: "Page number for pagination",
    required: false,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number = 0;

  @ApiProperty({
    description: "Number of items per page",
    required: false,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
