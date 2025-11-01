import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { AttachmentType } from "../enum/enum";

export class DirectUploadInitDto {
  @ApiProperty({
    description: "The ID of the direct conversation the file belongs to",
    example: "68da1234abcd5678efgh9012",
  })
  @IsMongoId()
  conversationId: string;
}

export class DirectUploadResponseDto {
  @ApiProperty({
    description: "The unique ID of the upload record (MongoId)",
    example: "68db1234abcd5678efgh9013",
  })
  @IsMongoId()
  uploadId: string;

  @ApiProperty({
    description: "The type of the attachment, detected by the server.",
    enum: AttachmentType,
    example: AttachmentType.IMAGE,
  })
  @IsEnum(AttachmentType)
  type: AttachmentType;

  @ApiPropertyOptional({
    description: "The IPFS hash (CID) if file was uploaded to IPFS.",
    example: "ipfs://QmT5NvUtoM5nWFfrQdVrFtvGfKFmre5YEoWyv...",
  })
  @IsOptional()
  @IsString()
  ipfsHash?: string;

  @ApiProperty({
    description: "The original name of the file.",
    example: "my-vacation-photo.jpg",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "The size of the file in bytes.",
    example: 1048576, // 1MB
  })
  @IsInt()
  @Min(0)
  size: number;

  @ApiProperty({
    description: "The MIME type of the file.",
    example: "image/jpeg",
  })
  @IsString()
  mimeType: string;

  @ApiPropertyOptional({
    description: "The width of the image or video in pixels.",
    example: 1920,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({
    description: "The height of the image or video in pixels.",
    example: 1080,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({
    description: "The duration of the video or audio in milliseconds.",
    example: 15000, // 15 seconds
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMs?: number;
}
