import z from 'zod';

export const userPayloadSchema = z.object({
  sub: z.string().brand<'UserSub'>(),
  iss: z.string(),
});
export type UserPayload = z.infer<typeof userPayloadSchema>;
