import { Injectable } from '@nestjs/common';

@Injectable()
export class DehiveApiGatewayService {
  getHello(): string {
    return 'Hello World!';
  }
}
