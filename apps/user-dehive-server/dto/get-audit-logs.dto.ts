import { IsOptional, IsInt, Min, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { AuditLogAction } from "../enum/enum";

export class GetAuditLogsDto {
  @IsOptional()
  @IsEnum(AuditLogAction)
  action?: AuditLogAction;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
