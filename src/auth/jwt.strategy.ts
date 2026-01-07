import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable } from '@nestjs/common';
import { UserPayload, userPayloadSchema } from './jwt.schema';

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: process.env.JWT_SECRET!.replace(/\\n/g, '\n'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  validate(payload: any): UserPayload {
    const userPayload = userPayloadSchema.safeParse(payload);

    if (!userPayload.success) {
      console.error(userPayload.error);
      throw new BadRequestException('Invalid JWT payload.');
    }

    const expectedIssuer = process.env.JWT_ISSUER;
    const expectedAudience = process.env.JWT_AUDIENCE;

    if (userPayload.data.iss !== expectedIssuer) {
      throw new BadRequestException('Invalid JWT payload.');
    }

    if (userPayload.data.aud !== expectedAudience) {
      throw new BadRequestException('Invalid JWT payload.');
    }

    return userPayload.data;
  }
}
