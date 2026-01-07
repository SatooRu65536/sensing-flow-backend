import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: vi.fn().mockReturnValue('Hello World!'),
          },
        },
      ],
    }).compile();

    appController = moduleRef.get(AppController);
  });

  describe('getRoot', () => {
    it('Serviceの結果を返す', () => {
      const result = appController.getRoot();
      expect(result).toBe('Hello World!');
    });
  });

  describe('getHello', () => {
    it('Serviceの結果を返す', () => {
      const result = appController.getHello();
      expect(result).toBe('Hello World!');
    });
  });
});
