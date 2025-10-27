import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AcceptCallDto {
  @ApiProperty({
    description: "ID of the conversation to accept call",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  @IsNotEmpty()
  conversation_id: string;
}
