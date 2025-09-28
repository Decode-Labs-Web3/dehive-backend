import {
  IsString,
  IsNotEmpty,
  Length,
  IsMongoId,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttachmentDto } from './attachment.dto';

export class CreateMessageDto {
  @ApiProperty({
    description: 'The ID of the channel conversation to send the message to.',
    example: '68c5adb6ec465897d540c58',
  })
  @IsNotEmpty({ message: 'conversationId is required' })
  @IsMongoId({ message: 'conversationId must be a valid MongoId' })
  conversationId: string;

  @ApiProperty({
    description: 'The text content of the message.',
    example: 'Hello everyone! How is the project going?',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  content: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'List of upload IDs to attach',
  })
  @IsOptional()
  @IsArray()
  uploadIds?: string[];

  @ApiPropertyOptional({
    type: [AttachmentDto],
    description:
      'Optional explicit attachments; server may ignore if uploadIds provided',
  })
  @IsOptional()
  attachments?: AttachmentDto[];
}
