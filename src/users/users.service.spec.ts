import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUserRequest, CreateUserResponse, GetUserResponse, User } from './users.dto';
import { DrizzleQueryError } from 'drizzle-orm';

describe('UsersService', () => {
  let usersService: UsersService;
  const dbMock = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    // デフォルトの成功値を設定しておく
    $returningId: vi.fn().mockResolvedValue([{ id: '00000000-0000-0000-0000-000000000000' }]),
    query: {
      UserSchema: {
        findFirst: vi.fn(),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'DRIZZLE_DB',
          useValue: dbMock,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  describe('createUser', () => {
    it('正常にユーザーを作成できる', async () => {
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

      const result = await usersService.createUser(user, body);
      expect(result).toEqual(response);
    });

    it('選択不可能なプランの場合、BadRequestExceptionを投げる', async () => {
      const user: User = {
        sub: 'sub_example',
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const body: CreateUserRequest = { name: 'Taro', plan: 'admin' };

      await expect(usersService.createUser(user, body)).rejects.toThrow(BadRequestException);
    });

    it('DB挿入でIDが返ってこない場合、InternalServerErrorExceptionを投げる', async () => {
      const user: User = {
        sub: 'sub_example',
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const body: CreateUserRequest = { name: 'Taro', plan: 'basic' };

      vi.spyOn(dbMock, '$returningId').mockResolvedValue([]);

      await expect(usersService.createUser(user, body)).rejects.toThrow(InternalServerErrorException);
    });

    it('重複エラーの場合、BadRequestExceptionを投げる', async () => {
      const user: User = {
        sub: 'sub_example',
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const body: CreateUserRequest = { name: 'Taro', plan: 'basic' };

      class MySQLError extends Error {
        code?: string;
        constructor(code: string) {
          super();
          this.code = code;
        }
      }

      vi.spyOn(dbMock, '$returningId').mockRejectedValue(
        new DrizzleQueryError('Duplicate entry', [], new MySQLError('ER_DUP_ENTRY')),
      );

      await expect(usersService.createUser(user, body)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMe', () => {
    it('ユーザー情報をそのまま返す', () => {
      const user: User = {
        sub: 'sub_example',
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const response: GetUserResponse = {
        id: user.id,
        name: user.name,
        plan: user.plan,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      expect(usersService.getMe(user)).toEqual(response);
    });
  });

  describe('getPlan', () => {
    it('プラン情報のみを返す', () => {
      const user: User = {
        sub: 'sub_example',
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(usersService.getPlan(user)).toEqual({ plan: 'basic' });
    });
  });

  describe('getUserBySub', () => {
    it('ユーザーが見つかった場合、そのレコードを返す', async () => {
      const user: User = {
        sub: 'sub_exist',
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(dbMock.query.UserSchema, 'findFirst').mockResolvedValue(user);

      const result = await usersService.getUserBySub('sub_exist');
      expect(result).toEqual(user);
    });

    it('ユーザーが見つからない場合、NotFoundExceptionを投げる', async () => {
      vi.spyOn(dbMock.query.UserSchema, 'findFirst').mockResolvedValue(null);

      await expect(usersService.getUserBySub('sub_not_exist')).rejects.toThrow(NotFoundException);
    });
  });
});
