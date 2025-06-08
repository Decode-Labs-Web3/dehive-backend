import { Controller, Get, Post, Body, Headers, Param, Put } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('health')
  getHealth() {
    return this.userService.getHealth();
  }

  @Get('me')
  getMe(@Headers('Authorization') auth: string) {
    console.log('CONTROLLER DEBUG getMe auth', auth);
    if (!auth || !auth.startsWith('Bearer ')) {
      console.log('CONTROLLER DEBUG getMe auth invalid');
      throw new Error('Invalid authorization header');
    }
    const accessToken = auth.split(' ')[1];
    return this.userService.viewMyProfile(accessToken);
  } 

  @Get(':userId')
  getUserPublicProfile(
    @Param('userId') userId: string,
    @Headers('Authorization') auth: string
  ) {
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header');
    }
    const accessToken = auth.split(' ')[1];
    return this.userService.viewUserPublicProfile(userId, accessToken);
  }

  @Post('check-username')
  checkUsername(@Body() payload: any, @Headers('Authorization') auth: string) {
    console.log('CONTROLLER DEBUG check-username payload', payload);
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header');
    }
    const accessToken = auth.split(' ')[1];
    return this.userService.checkUsername(payload.username, accessToken);
  }

  @Put('edit')
  editUser(@Body() payload: any, @Headers('Authorization') auth: string) {
    console.log('CONTROLLER DEBUG editUser payload', payload);
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header');
    }
    const accessToken = auth.split(' ')[1];
    return this.userService.editUser(payload, accessToken);
  }
}
