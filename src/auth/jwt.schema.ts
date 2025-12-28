import { planSchema } from './permissions.schema';
import z from 'zod';

export const userPayloadSchema = z
  .object({
    sub: z.uuid(),
    email: z.email(),
    'custom:plan': planSchema.optional(),
    'cognito:username': z.string(),
  })
  .transform((data) => ({
    sub: data.sub,
    email: data.email,
    plan: data['custom:plan'] ?? 'guest',
    username: data['cognito:username'],
  }));
export type UserPayload = z.infer<typeof userPayloadSchema>;
