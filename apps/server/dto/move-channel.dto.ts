import { IsString, IsNotEmpty, IsMongoId } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class MoveChannelDto {
  @ApiProperty({
    description: "The ID of the new category to move this channel to.",
    example: "68c40af9dfffdf7ae4af2e8c",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  category_id: string;
}
