import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import * as jwksRsa from 'jwks-rsa';
import { userPayloadSchema } from './jwt.schema';

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://cognito-idp.ap-northeast-1.amazonaws.com/${process.env.AWS_USER_POOL_ID}/.well-known/jwks.json`,
      }),
    });
  }

  validate(payload: any) {
    const user = userPayloadSchema.safeParse(payload);

    if (!user.success) {
      throw new Error('Invalid JWT payload');
    }

    return user.data;
  }
}
