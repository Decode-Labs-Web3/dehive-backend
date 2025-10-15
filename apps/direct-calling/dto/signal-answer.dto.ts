import { IsString, IsNotEmpty, IsOptional, IsObject } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SignalAnswerDto {
  @ApiProperty({
    description: "ID of the call",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  @IsNotEmpty()
  call_id: string;

  @ApiProperty({
    description: "WebRTC answer SDP",
    example: "v=0\r\no=- 1234567890 1234567890 IN IP4 127.0.0.1\r\n...",
  })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiProperty({
    description: "Additional answer metadata",
    example: { type: "answer", sdp: "..." },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
