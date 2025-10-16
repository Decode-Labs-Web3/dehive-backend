import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LeaveCallDto {
  @ApiProperty({
    description: "ID of the call to leave",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  @IsNotEmpty()
  call_id: string;
}
