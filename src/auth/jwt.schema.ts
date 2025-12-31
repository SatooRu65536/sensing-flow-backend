import z from 'zod';

export const userPayloadSchema = z.object({
  sub: z.string(),
  email: z.email(),
  iss: z.string(),
  aud: z.string(),
});
export type UserPayload = z.infer<typeof userPayloadSchema>;
