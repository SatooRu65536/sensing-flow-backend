import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BadRequestException } from '@nestjs/common';
import { CreateUserRequest, CreateUserResponse, GetPlanResponse, User } from './users.dto';

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
      const user: User = {
        sub: 'sub_example',
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const body: CreateUserRequest = { name: 'Taro', plan: 'basic' };
      const response: CreateUserResponse = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
      };

      vi.spyOn(usersService, 'createUser').mockResolvedValue(response);
      const result = await usersController.createUser(user, body);

      expect(result).toEqual(response);
    });

    it('Serviceの例外を伝播する', async () => {
      const user = {} as User;
      const body = {} as CreateUserRequest;

      vi.spyOn(usersService, 'createUser').mockRejectedValue(new BadRequestException());

      await expect(usersController.createUser(user, body)).rejects.toThrow(BadRequestException);
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
