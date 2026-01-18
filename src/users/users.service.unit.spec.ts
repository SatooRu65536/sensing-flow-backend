import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUserRequest, CreateUserResponse, GetUserResponse } from './users.dto';
import { DrizzleDuplicateError } from '@/common/errors/drizzle-duplicate.error';
import { createDbServiceMock, DbMock } from '@/common/utils/test/service-mocks';
import { createUser, createUserPayload } from '@/common/utils/test/test-factories';

describe('UsersService', () => {
  let usersService: UsersService;
  let dbMock: DbMock;

  beforeEach(async () => {
    dbMock = createDbServiceMock();

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
      const userPayload = createUserPayload();
      const body: CreateUserRequest = { name: 'Taro', plan: 'basic' };
      const response: CreateUserResponse = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taro',
        plan: 'basic',
      };

      vi.spyOn(dbMock, '$returningId').mockResolvedValue([{ id: response.id }]);

      const result = await usersService.createUser(userPayload, body);
      expect(result).toStrictEqual(response);
    });

    it('選択不可能なプランの場合、BadRequestExceptionを投げる', async () => {
      const userPayload = createUserPayload();
      const body: CreateUserRequest = { name: 'Taro', plan: 'admin' };

      await expect(usersService.createUser(userPayload, body)).rejects.toThrow(BadRequestException);
    });

    it('DB挿入でIDが返ってこない場合、InternalServerErrorExceptionを投げる', async () => {
      const userPayload = createUserPayload();
      const body: CreateUserRequest = { name: 'Taro', plan: 'basic' };

      vi.spyOn(dbMock, '$returningId').mockResolvedValue([]);

      await expect(usersService.createUser(userPayload, body)).rejects.toThrow(InternalServerErrorException);
    });

    it('重複エラーの場合、BadRequestExceptionを投げる', async () => {
      const userPayload = createUserPayload();
      const body: CreateUserRequest = { name: 'Taro', plan: 'basic' };

      vi.spyOn(dbMock, '$returningId').mockRejectedValue(new DrizzleDuplicateError());

      await expect(usersService.createUser(userPayload, body)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMe', () => {
    it('ユーザー情報をそのまま返す', () => {
      const user = createUser();
      const response: GetUserResponse = {
        id: user.id,
        name: user.name,
        plan: user.plan,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      expect(usersService.getMe(user)).toStrictEqual(response);
    });
  });

  describe('getPlan', () => {
    it('プラン情報のみを返す', () => {
      const user = createUser({ plan: 'basic' });
      expect(usersService.getPlan(user)).toStrictEqual({ plan: 'basic' });
    });
  });

  describe('getUserBySub', () => {
    it('ユーザーが見つかった場合、そのレコードを返す', async () => {
      const user = createUser({ sub: 'sub_exist' });

      vi.spyOn(dbMock.query.UserSchema, 'findFirst').mockResolvedValue(user);

      const result = await usersService.getUserBySub('sub_exist');
      expect(result).toStrictEqual(user);
    });

    it('ユーザーが見つからない場合、NotFoundExceptionを投げる', async () => {
      vi.spyOn(dbMock.query.UserSchema, 'findFirst').mockResolvedValue(null);

      await expect(usersService.getUserBySub('sub_not_exist')).rejects.toThrow(NotFoundException);
    });
  });
});
