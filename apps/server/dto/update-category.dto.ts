import {
    IsString, 
    IsNotEmpty, 
    Length, 
    IsOptional,
  IsNumber,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsNumber()
  position?: number;
}
