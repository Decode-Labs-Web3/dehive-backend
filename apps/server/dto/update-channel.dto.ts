import { IsString, IsNotEmpty, Length, IsOptional, IsNumber, IsMongoId } from 'class-validator';

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1024)
  topic?: string;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsMongoId()
  category_id?: string; 
}