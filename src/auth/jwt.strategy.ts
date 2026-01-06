import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable } from '@nestjs/common';
import { userPayloadSchema } from './jwt.schema';
import { UsersService } from '@/users/users.service';
import { User } from '@/users/users.dto';

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: process.env.JWT_SECRET!.replace(/\\n/g, '\n'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: any): Promise<User> {
    const userPayload = userPayloadSchema.safeParse(payload);

    if (!userPayload.success) {
      throw new BadRequestException(`Invalid JWT payload. Errors: ${JSON.stringify(userPayload.error.issues)}`);
    }

    const expectedIssuer = process.env.JWT_ISSUER;
    const expectedAudience = process.env.JWT_AUDIENCE;

    if (userPayload.data.iss !== expectedIssuer) {
      throw new BadRequestException('Invalid JWT payload.');
    }

    if (userPayload.data.aud !== expectedAudience) {
      throw new BadRequestException('Invalid JWT payload.');
    }

    const user = await this.usersService.getUserBySub(userPayload.data.sub);

    return user;
  }
}
