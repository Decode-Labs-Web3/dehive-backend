import { Module } from '@nestjs/common';
import { DehiveApiGatewayController } from './dehive-api-gateway.controller';
import { DehiveApiGatewayService } from './dehive-api-gateway.service';

@Module({
  imports: [],
  controllers: [DehiveApiGatewayController],
  providers: [DehiveApiGatewayService],
})
export class DehiveApiGatewayModule {}
