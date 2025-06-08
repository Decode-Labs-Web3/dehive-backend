import { Controller, Get, Param } from '@nestjs/common';
import { UserDehiveService } from '../src/user-dehive.service';

@Controller('user-dehive')
export class UserDehiveController {
  constructor(private readonly service: UserDehiveService) {}

  @Get(':id')
  async getEnriched(@Param('id') id: string) {
    return this.service.getEnrichedUser(id);
  }
}