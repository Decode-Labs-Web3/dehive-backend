import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateAvatarDto {
  @ApiProperty({
    description: "IPFS hash of the avatar image",
    example: "QmbXHaimebEAu9YtAwKYEsNVgM9PQeYvW3hpDEj5uryiS6",
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: "Avatar IPFS hash is required" })
  avatar_ipfs_hash: string;
}
