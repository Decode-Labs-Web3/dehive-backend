import { IsMongoId, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class InviteUserDto {
  @ApiProperty({
    description: "The Dehive Profile ID of the user sending the invite.",
  })
  @IsNotEmpty()
  @IsMongoId()
  inviter_id: string;

  @ApiProperty({
    description: "The Dehive Profile ID of the user being invited.",
  })
  @IsNotEmpty()
  @IsMongoId()
  invitee_id: string;

  @ApiProperty({ description: "The ID of the server to invite to." })
  @IsNotEmpty()
  @IsMongoId()
  server_id: string;
}
