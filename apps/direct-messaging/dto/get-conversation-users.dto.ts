import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class GetConversationUsersDto {
  @ApiProperty({
    description: "Conversation ID to get users from",
    type: String,
    example: "68e8b59f806fb5c06c6551a3",
  })
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
