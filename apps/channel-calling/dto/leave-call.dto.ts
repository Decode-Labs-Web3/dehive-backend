import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LeaveCallDto {
  @ApiProperty({
    description: "ID of the channel to leave",
    example: "68e79a7a52197caed37269dc",
  })
  @IsString()
  @IsNotEmpty()
  channel_id: string;
}
