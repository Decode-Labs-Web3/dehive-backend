import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsNumber,
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
    description: "ICE candidate information",
    example: "candidate:1 1 UDP 2113667326 192.168.1.100 54400 typ host",
  })
  @IsString()
  @IsNotEmpty()
  candidate: string;

  @ApiProperty({
    description: "SDP media line index",
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  sdpMLineIndex?: number;

  @ApiProperty({
    description: "SDP media line name",
    example: "audio",
    required: false,
  })
  @IsOptional()
  sdpMid?: string;

  @ApiProperty({
    description: "Additional candidate metadata",
    example: { type: "candidate", sdp: "..." },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
