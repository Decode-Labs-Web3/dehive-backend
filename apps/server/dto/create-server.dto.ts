import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServerDto {
  @ApiProperty({
    description: 'The name of the new server.',
    example: 'My Awesome Community',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string;

  @ApiProperty({
    description: 'A brief description of the server (optional).',
    example: 'A place to hang out and chat.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  readonly description?: string;
}
