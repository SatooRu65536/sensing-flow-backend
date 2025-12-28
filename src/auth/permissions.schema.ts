import z from 'zod';

export const planSchema = z.enum(['guest', 'trial', 'basic', 'pro']);

export const permissionSchema = z.object({
  resource: z.string(),
  action: z.string(),
  description: z.string(),
});
export const permissionNameSchema = z.string().refine((val) => val.includes(':'), {
  message: 'Permission name must be in the format "action:resource"',
});

export const permissionConfigSchema = z.object({
  plans: z.record(planSchema, z.array(permissionNameSchema)),
  permissions: z.record(permissionNameSchema, z.string()),
});
export type PermissionConfig = z.infer<typeof permissionConfigSchema>;
