import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsMongoId, IsOptional, IsString, Min } from "class-validator";
import { AttachmentType } from "../enum/enum";

export class UploadInitDto {
  @ApiPropertyOptional({ description: "Server ID for permission check" })
  @IsOptional()
  @IsMongoId()
  serverId?: string;

  @ApiPropertyOptional({
    description: "Channel ID for permission check",
  })
  @IsOptional()
  @IsMongoId()
  channelId?: string;
}

export class UploadResponseDto {
  @ApiProperty({ description: "Upload ID (MongoId) to reference in chat" })
  @IsMongoId()
  uploadId: string;

  @ApiProperty({ enum: AttachmentType })
  type: AttachmentType;

  @ApiPropertyOptional({
    description: "The IPFS hash (CID) if file was uploaded to IPFS.",
    example: "ipfs://QmT5NvUtoM5nWFfrQdVrFtvGfKFmre5YEoWyv...",
  })
  @IsOptional()
  @IsString()
  ipfsHash?: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: "File size in bytes" })
  @IsInt()
  @Min(0)
  size: number;

  @ApiProperty({ example: "image/jpeg" })
  mimeType: string;

  @ApiPropertyOptional({ description: "Error message if upload failed" })
  errorMessage?: string;

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;

  @ApiPropertyOptional()
  durationMs?: number;
}
