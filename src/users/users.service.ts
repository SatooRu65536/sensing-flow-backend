import { Inject, Injectable } from '@nestjs/common';
import type { DbType } from '../database/database.module';
import { UserPayload } from '@/auth/jwt.schema';
import { AdminGetUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { planEnumSchema } from '@/plans-config/plans-config.schema';
import { GetPlanResponse } from './users.dto';

@Injectable()
export class UsersService {
  constructor(@Inject('DRIZZLE_DB') private db: DbType) {}

  async getPlan(user: UserPayload): Promise<GetPlanResponse> {
    try {
      const getCredentials = fromIni({ profile: 'sensing-flow-dev' });
      const credentials = await getCredentials();

      const cognito = new CognitoIdentityProviderClient({
        region: process.env.AWS_COGNITO_REGION,
        credentials,
      });

      const command = new AdminGetUserCommand({
        UserPoolId: process.env.AWS_USER_POOL_ID!,
        Username: user.sub,
      });
      const result = await cognito.send(command);
      const plan = result.UserAttributes?.find((attr) => attr.Name === 'custom:plan')?.Value || null;
      const validPlan = planEnumSchema.parse(plan);
      return { plan: validPlan };
    } catch (error) {
      console.error('プラン名が取得できませんでした:', error);
      return { plan: 'guest' };
    }
  }
}
