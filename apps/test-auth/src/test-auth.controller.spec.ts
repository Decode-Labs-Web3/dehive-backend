import { Test, TestingModule } from '@nestjs/testing';
import { TestAuthController } from './test-auth.controller';
import { TestAuthService } from './test-auth.service';

describe('TestAuthController', () => {
  let testAuthController: TestAuthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TestAuthController],
      providers: [TestAuthService],
    }).compile();

    testAuthController = app.get<TestAuthController>(TestAuthController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(testAuthController.getHello()).toBe('Hello World!');
    });
  });
});
