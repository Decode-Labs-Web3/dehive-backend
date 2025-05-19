import { Test, TestingModule } from '@nestjs/testing';
import { UserDehiveController } from './user-dehive.controller';
import { UserDehiveService } from './user-dehive.service';

describe('UserDehiveController', () => {
  let userDehiveController: UserDehiveController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [UserDehiveController],
      providers: [UserDehiveService],
    }).compile();

    userDehiveController = app.get<UserDehiveController>(UserDehiveController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(userDehiveController.getHello()).toBe('Hello World!');
    });
  });
});
