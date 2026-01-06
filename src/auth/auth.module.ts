import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JWTStrategy } from './jwt.strategy';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UsersModule],
  providers: [JWTStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
