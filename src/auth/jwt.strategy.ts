import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable } from '@nestjs/common';
import { userPayloadSchema } from './jwt.schema';

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

  validate(payload: any) {
    const user = userPayloadSchema.safeParse(payload);

    if (!user.success) {
      throw new BadRequestException(`Invalid JWT payload. Errors: ${JSON.stringify(user.error.issues)}`);
    }

    const expectedIssuer = process.env.JWT_ISSUER;
    const expectedAudience = process.env.JWT_AUDIENCE;

    if (user.data.iss !== expectedIssuer) {
      throw new BadRequestException('Invalid JWT payload.');
    }

    if (user.data.aud !== expectedAudience) {
      throw new BadRequestException('Invalid JWT payload.');
    }

    return user.data;
  }
}
