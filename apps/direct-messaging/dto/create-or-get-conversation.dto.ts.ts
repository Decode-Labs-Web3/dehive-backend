import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreateOrGetConversationDto {
  @ApiProperty({ description: 'UserDehiveId of the other participant' })
  @IsMongoId()
  otherUserDehiveId: string;
}
