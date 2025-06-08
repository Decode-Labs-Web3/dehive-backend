import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { User } from '../schemas/user.schema';
import { EditUserDto } from '../dto/editUser.dto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('user.health')
  getHealth(): { status: string } {
    return { status: 'ok user.health' };
  }

  @MessagePattern('user.viewMyProfile')
  viewMyProfile(@Payload() payload: { accessToken: string }) {
    return this.userService.viewMyProfile(payload.accessToken);
  }

  @MessagePattern('user.viewUserPublicProfile')
  viewUserPublicProfile(@Payload() payload: { userId: string, accessToken: string }) {
    return this.userService.viewUserPublicProfile(payload.userId, payload.accessToken);
  }

  @MessagePattern('user.checkUsername')
  checkUsername(@Payload() payload: { username: string, accessToken: string }) {
    return this.userService.checkUsername(payload.username, payload.accessToken);
  }

  @MessagePattern('user.editUser')
  editUser(@Payload() payload: { payload: EditUserDto, accessToken: string }) {
    console.log("Controller DEBUG editUser payload", payload);
    return this.userService.editUser(payload.payload, payload.accessToken);
  }
  
}
