import { Controller, Get } from '@nestjs/common';
import { UserDehiveService } from './user-dehive.service';

@Controller()
export class UserDehiveController {
  constructor(private readonly userDehiveService: UserDehiveService) {}

  @Get()
  getHello(): string {
    return this.userDehiveService.getHello();
  }
}
