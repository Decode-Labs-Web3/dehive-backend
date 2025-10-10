import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListDirectMessagesDto {
  @ApiPropertyOptional({
    description: 'The page number to retrieve, starting from 0',
    default: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page = 0;

  @ApiPropertyOptional({
    description: 'The number of messages to retrieve per page (max 100)',
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
