import { Injectable } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { ClientProxyFactory } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class DehiveApiGatewayService {
  getHello(): string {
    return 'Hello World!';
  }

  getAuth(): Observable<string> {
    const client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 3001,
      },
    });

    return client.send('auth', {});
  }
}
