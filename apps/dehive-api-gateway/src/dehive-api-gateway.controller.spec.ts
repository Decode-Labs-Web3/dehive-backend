import { Test, TestingModule } from '@nestjs/testing';
import { DehiveApiGatewayController } from './dehive-api-gateway.controller';
import { DehiveApiGatewayService } from './dehive-api-gateway.service';

describe('DehiveApiGatewayController', () => {
  let dehiveApiGatewayController: DehiveApiGatewayController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DehiveApiGatewayController],
      providers: [DehiveApiGatewayService],
    }).compile();

    dehiveApiGatewayController = app.get<DehiveApiGatewayController>(DehiveApiGatewayController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(dehiveApiGatewayController.getHello()).toBe('Hello World!');
    });
  });
});
