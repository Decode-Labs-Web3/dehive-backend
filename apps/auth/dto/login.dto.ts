import { IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  username_or_email: string;

  @MinLength(6)
  @IsNotEmpty()
  password: string;
}
