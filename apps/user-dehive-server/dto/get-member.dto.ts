import { IsMongoId, IsNotEmpty } from "class-validator";
export class GetMemberParamsDto {
  @IsNotEmpty() @IsMongoId() serverId: string;
  @IsNotEmpty() @IsMongoId() memberId: string;
}
