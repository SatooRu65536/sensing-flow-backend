import { BadRequestException } from '@nestjs/common';
import { JWTStrategy } from './jwt.strategy';
import { createUserPayload } from '@/common/utils/test/test-factories';

describe('JWTStrategy', () => {
  const jwtIssuer = 'test-issuer';
  const jwtSecret = 'dummysecret';
  let strategy: JWTStrategy;

  beforeEach(() => {
    process.env.JWT_ISSUER = jwtIssuer;
    process.env.JWT_SECRET = jwtSecret;
    strategy = new JWTStrategy();
  });

  it('正しい payload の場合、UserPayload を返す', () => {
    const validPayload = createUserPayload({
      iss: jwtIssuer,
    });

    const result = strategy.validate(validPayload);
    expect(result).toStrictEqual(validPayload);
  });

  it('iss が期待値と異なる場合、BadRequestException を投げる', () => {
    const validPayload = createUserPayload({
      iss: 'wrong-issuer',
    });

    expect(() => strategy.validate(validPayload)).toThrow(BadRequestException);
  });
});
