import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { User } from './schemas/user.schema';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  getHello(): string {
    return this.authService.getHello();
  }

  @MessagePattern('auth')
  getAuth() {
    return this.authService.getHello();
  }

  @MessagePattern('createUser')
  createUser(@Payload() user: User) {
    return this.authService.createUser(user);
  }
}
