import { BadRequestException } from '@nestjs/common';
import { JWTStrategy } from './jwt.strategy';
import { createUserPayload } from '@/utils/test/test-factories';

describe('JWTStrategy', () => {
  const jwtIssuer = 'test-issuer';
  const jwtAudience = 'test-audience';
  const jwtSecret = 'dummysecret';
  let strategy: JWTStrategy;

  beforeEach(() => {
    process.env.JWT_ISSUER = jwtIssuer;
    process.env.JWT_AUDIENCE = jwtAudience;
    process.env.JWT_SECRET = jwtSecret;
    strategy = new JWTStrategy();
  });

  it('正しい payload の場合、UserPayload を返す', () => {
    const validPayload = createUserPayload({
      iss: jwtIssuer,
      aud: jwtAudience,
    });

    const result = strategy.validate(validPayload);
    expect(result).toEqual(validPayload);
  });

  it('スキーマ検証に失敗した場合、BadRequestException を投げる', () => {
    const validPayload = createUserPayload({
      iss: jwtIssuer,
      aud: jwtAudience,
    });

    const invalidPayload = { ...validPayload, email: 123 }; // email が不正

    expect(() => strategy.validate(invalidPayload)).toThrow(BadRequestException);
  });

  it('iss が期待値と異なる場合、BadRequestException を投げる', () => {
    const validPayload = createUserPayload({
      iss: 'wrong-issuer',
      aud: jwtAudience,
    });

    expect(() => strategy.validate(validPayload)).toThrow(BadRequestException);
  });

  it('aud が期待値と異なる場合、BadRequestException を投げる', () => {
    const validPayload = createUserPayload({
      iss: jwtIssuer,
      aud: 'wrong-audience',
    });

    expect(() => strategy.validate(validPayload)).toThrow(BadRequestException);
  });
});
