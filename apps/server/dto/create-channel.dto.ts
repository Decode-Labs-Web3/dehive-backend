import { IsString, IsNotEmpty, Length, IsEnum, IsOptional } from 'class-validator';

export enum ChannelType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
}

export class CreateChannelDto {

  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name cannot be empty.' })
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters.' })
  name: string;

  @IsEnum(ChannelType, { message: 'Type must be either TEXT or VOICE.' })
  @IsNotEmpty({ message: 'Type cannot be empty.' })
  type: ChannelType;

  @IsOptional()
  @IsString()
  @Length(0, 1024, { message: 'Topic must not exceed 1024 characters.' })
  topic?: string;
}