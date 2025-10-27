import { IsArray, IsNotEmpty } from "class-validator";

export class BulkStatusDto {
  @IsArray()
  @IsNotEmpty()
  user_ids: string[];
}
