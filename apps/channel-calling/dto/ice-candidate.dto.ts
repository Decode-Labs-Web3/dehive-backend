import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsObject,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class IceCandidateDto {
  @ApiProperty({
    description: "ID of the call",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  @IsNotEmpty()
  call_id: string;

  @ApiProperty({
    description: "Target user ID to send ICE candidate to",
    example: "507f1f77bcf86cd799439012",
  })
  @IsString()
  @IsNotEmpty()
  target_user_id: string;

  @ApiProperty({
    description: "ICE candidate string",
    example: "candidate:1 1 UDP 2113667326 192.168.1.10 54321 typ host",
  })
  @IsString()
  @IsNotEmpty()
  candidate: string;

  @ApiProperty({
    description: "SDP M-line index",
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  sdpMLineIndex?: number;

  @ApiProperty({
    description: "SDP media ID",
    example: "audio",
    required: false,
  })
  @IsOptional()
  @IsString()
  sdpMid?: string;

  @ApiProperty({
    description: "Additional metadata",
    example: {},
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
