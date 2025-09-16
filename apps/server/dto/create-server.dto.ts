import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateServerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  readonly description?: string;
}
