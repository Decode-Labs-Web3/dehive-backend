import { IsString, IsNotEmpty } from "class-validator";

export class SetStatusDto {
  @IsString()
  @IsNotEmpty()
  userDehiveId: string;
}
