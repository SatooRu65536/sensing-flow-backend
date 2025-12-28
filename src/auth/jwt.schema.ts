import { planSchema } from '../plans-config/plans-config.schema';
import z from 'zod';

export const userPayloadSchema = z
  .object({
    sub: z.string(),
    email: z.email(),
    'custom:plan': planSchema.optional(),
  })
  .transform((data) => ({
    sub: data.sub,
    email: data.email,
    plan: data['custom:plan'] ?? 'guest',
  }));
export type UserPayload = z.infer<typeof userPayloadSchema>;
