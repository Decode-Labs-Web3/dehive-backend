import {
  IsString,
  IsNotEmpty,
  Length,
  IsMongoId,
  IsOptional,
  IsArray,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AttachmentDto } from "./attachment.dto";

export class CreateMessageDto {
  @ApiProperty({
    description: "The ID of the channel conversation to send the message to.",
    example: "68c5adb6ec465897d540c58",
  })
  @IsNotEmpty({ message: "conversationId is required" })
  @IsMongoId({ message: "conversationId must be a valid MongoId" })
  conversationId: string;

  @ApiProperty({
    description:
      "The text content of the message (empty string if only sending files)",
    example: "Hello everyone! How is the project going?",
    maxLength: 2000,
    default: "",
  })
  @IsString()
  @Length(0, 2000)
  content: string;

  @ApiProperty({
    type: [String],
    description: "List of upload IDs to attach (empty array if no files)",
    example: ["68db1234abcd5678efgh9013"],
    default: [],
  })
  @IsArray()
  @IsMongoId({ each: true, message: "Each uploadId must be a valid MongoId" })
  uploadIds: string[];

  @ApiPropertyOptional({
    type: [AttachmentDto],
    description:
      "Optional explicit attachments; server may ignore if uploadIds provided",
  })
  @IsOptional()
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({
    description: "ID of the message being replied to (optional)",
    example: "68dc1234abcd5678efgh9014",
  })
  @IsOptional()
  @ValidateIf((o) => o.replyTo !== null && o.replyTo !== undefined)
  @IsMongoId({ message: "replyTo must be a valid MongoId" })
  replyTo?: string | null;
}
