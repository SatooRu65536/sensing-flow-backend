import z from 'zod';

export const userPayloadSchema = z
  .object({
    sub: z.string(),
    email: z.email(),
  })
  .transform((data) => ({
    sub: data.sub,
    email: data.email,
  }));
export type UserPayload = z.infer<typeof userPayloadSchema>;
