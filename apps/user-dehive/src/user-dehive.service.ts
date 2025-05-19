import { Injectable } from '@nestjs/common';

@Injectable()
export class UserDehiveService {
  getHello(): string {
    return 'Hello World!';
  }
}
