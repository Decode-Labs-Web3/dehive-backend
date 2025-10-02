import { Injectable } from '@nestjs/common';

@Injectable()
export class TestAuthService {
  getHello(): string {
    return 'Hello World!';
  }
}
