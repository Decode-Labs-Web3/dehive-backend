import { IsMongoId, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GetServerMembersDto {
  @ApiProperty({
    description: "The ID of the server to get members from",
    example: "68e09f0f8f924bd8b03d957a",
  })
  @IsNotEmpty({ message: "server_id should not be empty" })
  @IsMongoId({ message: "server_id must be a mongodb id" })
  serverId: string;
}
