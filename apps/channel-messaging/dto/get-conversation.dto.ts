import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetConversationDto {
  @ApiProperty({
    description: 'The ID of the channel to get conversation for',
    example: '68c5adb6ec465897d540c58',
  })
  @IsNotEmpty({ message: 'channelId is required' })
  @IsMongoId({ message: 'channelId must be a valid MongoId' })
  channelId: string;
}
