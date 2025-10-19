import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class JoinCallDto {
  @ApiProperty({
    description: "ID of the channel to join call",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  @IsNotEmpty()
  channel_id: string;
}
