import { IsMongoId, IsNotEmpty, IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateNotificationDto {
  @ApiProperty({
    description:
      "The ID of the server where notification settings are being changed.",
    example: "68c5adb6ec465897d540c58",
  })
  @IsNotEmpty()
  @IsMongoId()
  server_id: string;

  @ApiProperty({ description: "The new mute status.", example: true })
  @IsNotEmpty()
  @IsBoolean()
  is_muted: boolean;
}
