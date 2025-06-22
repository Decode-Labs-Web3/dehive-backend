import { Controller, Get, Post, Headers, Body } from '@nestjs/common';
import { UserDehiveService } from './user-dehive.service';

@Controller('user-dehive')
export class UserDehiveController {
  constructor(private readonly userDehiveService: UserDehiveService) {}

  @Get()
  getHello(): string {
    return this.userDehiveService.getHello();
  }

  @Post('register')
  async register(@Headers('Authorization') decode_auth_token: string, @Body() body: any) {
    console.log('user-dehive controller register post', decode_auth_token, body);
    return await this.userDehiveService.register(decode_auth_token, body);
  }
}
