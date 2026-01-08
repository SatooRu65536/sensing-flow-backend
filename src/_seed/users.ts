import { UserSchema } from '@/_schema';
import { db } from '@/database/database.module';

interface Options {
  userIds: string[];
}
export async function seedUsers(options?: Options): Promise<string[]> {
  if (options?.userIds) {
    const results = await db
      .insert(UserSchema)
      .values(
        options.userIds.map((userId, index) => ({
          id: userId,
          name: `user${index + 1}`,
          plan: 'trial' as const,
          sub: `test|${userId}`,
        })),
      )
      .$returningId();
    return results.flatMap((r) => r.id);
  } else {
    const results = await db
      .insert(UserSchema)
      .values([
        {
          id: 'user-guest',
          name: 'taro',
          plan: 'guest',
          sub: 'test|user-guest',
        },
        {
          id: 'user-trial',
          name: 'jiro',
          plan: 'trial',
          sub: 'test|user-trial',
        },
        {
          id: 'user-basic',
          name: 'saburo',
          plan: 'basic',
          sub: 'test|user-basic',
        },
        {
          id: 'user-pro',
          name: 'saburo',
          plan: 'pro',
          sub: 'test|user-pro',
        },
        {
          id: 'user-pro',
          name: 'saburo',
          plan: 'pro',
          sub: 'test|user-pro',
        },
        {
          id: 'user-admin',
          name: 'saburo',
          plan: 'admin',
          sub: 'test|user-admin',
        },
        {
          id: 'user-developer',
          name: 'admin',
          plan: 'developer',
          sub: 'test|user-developer',
        },
      ])
      .$returningId();
    return results.flatMap((r) => r.id);
  }
}
