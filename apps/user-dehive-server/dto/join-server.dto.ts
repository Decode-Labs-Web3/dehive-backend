import { IsMongoId, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class JoinServerDto {
  @ApiProperty({
    description: "The ID of the server to join.",
    example: "68c5adb6ec465897d540c58",
  })
  @IsNotEmpty()
  @IsMongoId()
  server_id: string;
}
