import { UserSchema } from '@/_schema';
import { db } from '@/database/database.module';
import { userIdSchema, userNameSchema, userSubSchema } from '@/types/brand';

interface Options {
  userIds: string[];
}
export async function seedUsers(options?: Options): Promise<string[]> {
  if (options?.userIds) {
    const results = await db
      .insert(UserSchema)
      .values(
        options.userIds.map((userId, index) => ({
          id: userIdSchema.parse(userId),
          name: userNameSchema.parse(`user${index + 1}`),
          plan: 'trial' as const,
          sub: userSubSchema.parse(`test|${userId}`),
        })),
      )
      .$returningId();
    return results.flatMap((r) => r.id);
  } else {
    const results = await db
      .insert(UserSchema)
      .values([
        {
          id: userIdSchema.parse('user-guest'),
          name: userNameSchema.parse('taro'),
          plan: 'guest',
          sub: userSubSchema.parse('test|user-guest'),
        },
        {
          id: userIdSchema.parse('user-trial'),
          name: userNameSchema.parse('jiro'),
          plan: 'trial',
          sub: userSubSchema.parse('test|user-trial'),
        },
        {
          id: userIdSchema.parse('user-basic'),
          name: userNameSchema.parse('saburo'),
          plan: 'basic',
          sub: userSubSchema.parse('test|user-basic'),
        },
        {
          id: userIdSchema.parse('user-pro'),
          name: userNameSchema.parse('saburo'),
          plan: 'pro',
          sub: userSubSchema.parse('test|user-pro'),
        },
        {
          id: userIdSchema.parse('user-pro'),
          name: userNameSchema.parse('saburo'),
          plan: 'pro',
          sub: userSubSchema.parse('test|user-pro'),
        },
        {
          id: userIdSchema.parse('user-admin'),
          name: userNameSchema.parse('saburo'),
          plan: 'admin',
          sub: userSubSchema.parse('test|user-admin'),
        },
        {
          id: userIdSchema.parse('user-developer'),
          name: userNameSchema.parse('admin'),
          plan: 'developer',
          sub: userSubSchema.parse('test|user-developer'),
        },
      ])
      .$returningId();
    return results.flatMap((r) => r.id);
  }
}
