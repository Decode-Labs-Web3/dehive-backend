import { IsArray, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ServerTag } from "../enum/enum";

export class UpdateServerTagsDto {
  @ApiProperty({
    description: "Tags for the server.",
    example: ["gaming", "friends"],
    enum: ServerTag,
    isArray: true,
  })
  @IsArray()
  @IsEnum(ServerTag, { each: true })
  readonly tags: ServerTag[];
}
