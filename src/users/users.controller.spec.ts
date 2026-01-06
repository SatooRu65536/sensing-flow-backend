import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BadRequestException } from '@nestjs/common';
import { CreateUserRequest, CreateUserResponse, GetPlanResponse, User } from './users.dto';
import { UserPayload } from '@/auth/jwt.schema';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: UsersService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            createUser: vi.fn(),
            getMe: vi.fn(),
            getPlan: vi.fn(),
          },
        },
      ],
    }).compile();

    usersController = moduleRef.get(UsersController);
    usersService = moduleRef.get<UsersService>(UsersService);
  });

  describe('createUser', () => {
    it('Serviceの結果を返す', async () => {
      const userPayload: UserPayload = {
        sub: 'sub_example',
        aud: 'sensing-flow',
        iss: 'sensing-flow',
        email: 'taro@example.com',
      };
      const body: CreateUserRequest = { name: 'Taro', plan: 'basic' };
      const response: CreateUserResponse = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
      };

      vi.spyOn(usersService, 'createUser').mockResolvedValue(response);
      const result = await usersController.createUser(userPayload, body);

      expect(result).toEqual(response);
    });

    it('Serviceの例外を伝播する', async () => {
      const userPayload = {} as UserPayload;
      const body = {} as CreateUserRequest;

      vi.spyOn(usersService, 'createUser').mockRejectedValue(new BadRequestException());

      await expect(usersController.createUser(userPayload, body)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMe', () => {
    it('Serviceの結果を返す', () => {
      const user: User = {
        sub: 'sub_example',
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(usersService, 'getMe').mockReturnValue(user);

      expect(usersController.getMe(user)).toEqual(user);
    });
  });

  describe('getPlan', () => {
    it('Serviceの結果を返す', () => {
      const user: User = {
        sub: 'sub_example',
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const response: GetPlanResponse = { plan: 'basic' };

      vi.spyOn(usersService, 'getPlan').mockReturnValue(response);

      expect(usersController.getPlan(user)).toEqual(response);
    });
  });
});
