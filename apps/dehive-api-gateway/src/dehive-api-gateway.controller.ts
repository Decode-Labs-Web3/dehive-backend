import { Controller, Get } from '@nestjs/common';
import { DehiveApiGatewayService } from './dehive-api-gateway.service';
import { Observable } from 'rxjs';
@Controller()
export class DehiveApiGatewayController {
  constructor(
    private readonly dehiveApiGatewayService: DehiveApiGatewayService,
  ) {}

  @Get()
  getHello(): string {
    return this.dehiveApiGatewayService.getHello();
  }

  @Get('auth')
  getAuth(): Observable<string> {
    return this.dehiveApiGatewayService.getAuth();
  }
}
