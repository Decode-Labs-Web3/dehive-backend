import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, Transport } from '@nestjs/microservices';
import { ClientProxyFactory } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class ApiGatewayService {
  getHello(): string {  
    return 'Hello World!';
  }
}