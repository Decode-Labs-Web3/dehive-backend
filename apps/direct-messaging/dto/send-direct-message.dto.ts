import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class SendDirectMessageDto {
  @ApiProperty({
    description: 'The ID of the direct conversation',
    example: '68da1234abcd5678efgh9012',
  })
  @IsMongoId()
  conversationId: string;

  @ApiProperty({
    description: 'The text content of the message',
    minLength: 1,
    maxLength: 2000,
    example: 'Hello there!',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  content: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'An optional list of upload IDs to attach to the message',
    example: ['68db1234abcd5678efgh9013'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true, message: 'Each uploadId must be a valid MongoId' })
  uploadIds?: string[];
}
