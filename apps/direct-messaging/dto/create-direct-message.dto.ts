import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateOrGetConversationDto {
  @ApiProperty({ description: 'UserDehiveId of the other participant' })
  @IsMongoId()
  otherUserDehiveId: string;
}

export class SendDirectMessageDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsMongoId()
  conversationId: string;

  @ApiProperty({
    description: 'Message content',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  content: string;

  @ApiPropertyOptional({ type: [String], description: 'Optional uploadIds' })
  @IsOptional()
  @IsArray()
  uploadIds?: string[];
}

export class ListDirectMessagesDto {
  @ApiProperty({ default: 1 })
  page = 1;

  @ApiProperty({ default: 50 })
  limit = 50;
}

export class DirectUploadInitDto {
  @ApiProperty({ description: 'The ID of the direct conversation' })
  @IsMongoId()
  conversationId: string;
}
