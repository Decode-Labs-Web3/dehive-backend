import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class EditDirectMessageDto {
  @ApiProperty({ description: 'New message content', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  content: string;
}
