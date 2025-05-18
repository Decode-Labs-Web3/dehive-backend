import { Controller, Get } from '@nestjs/common';
import { DehiveApiGatewayService } from './dehive-api-gateway.service';

@Controller()
export class DehiveApiGatewayController {
  constructor(private readonly dehiveApiGatewayService: DehiveApiGatewayService) {}

  @Get()
  getHello(): string {
    return this.dehiveApiGatewayService.getHello();
  }
}
