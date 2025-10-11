import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from "class-validator";

export class SendDirectMessageDto {
  @ApiProperty({
    description: "The ID of the direct conversation",
    example: "68da1234abcd5678efgh9012",
  })
  @IsMongoId()
  conversationId: string;

  @ApiProperty({
    description:
      "The text content of the message (empty string if only sending files)",
    maxLength: 2000,
    example: "Hello there!",
    default: "",
  })
  @IsString()
  @Length(0, 2000)
  content: string;

  @ApiProperty({
    type: [String],
    description:
      "List of upload IDs to attach to the message (empty array if no files)",
    example: ["68db1234abcd5678efgh9013"],
    default: [],
  })
  @IsArray()
  @IsMongoId({ each: true, message: "Each uploadId must be a valid MongoId" })
  uploadIds: string[];

  @ApiProperty({
    description: "ID of the message being replied to (optional)",
    example: "68dc1234abcd5678efgh9014",
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.replyTo !== null && o.replyTo !== undefined)
  @IsMongoId({ message: "replyTo must be a valid MongoId" })
  replyTo?: string | null;
}
