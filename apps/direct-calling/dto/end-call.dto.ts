import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CallEndReason } from "../enum/enum";

export class EndCallDto {
  @ApiProperty({
    description: "ID of the call to end",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  @IsNotEmpty()
  call_id: string;

  @ApiProperty({
    description: "Reason for ending the call",
    example: CallEndReason.USER_HANGUP,
    enum: CallEndReason,
    required: false,
  })
  @IsOptional()
  @IsEnum(CallEndReason)
  reason?: CallEndReason = CallEndReason.USER_HANGUP;
}
