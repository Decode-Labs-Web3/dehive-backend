import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({
    description: 'The new name for the category.',
    example: '💬 Community Channels',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;

  @ApiProperty({
    description: 'The new position of the category in the list.',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  position?: number;
}
