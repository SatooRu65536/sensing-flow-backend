import { writeFileSync } from 'fs';
import { resolve } from 'path';
import z from 'zod';
import permissionsConfig from '../permissions.json';

export const planEnumSchema = z.enum(['guest', 'trial', 'basic', 'pro', 'admin']);
export type PlanEnum = z.infer<typeof planEnumSchema>;

export const permissionSchema = z.object({
  resource: z.string(),
  action: z.string(),
  description: z.string(),
});
export const permissionNameSchema = z.string().refine((val) => val.includes(':'), {
  message: 'Permission name must be in the format "action:resource"',
});

export const permissionsConfigSchema = z.object({
  permissions: z.record(permissionNameSchema, z.string()),
});
export type PermissionsConfig = z.infer<typeof permissionsConfigSchema>;

export const plansConfigSchema = z.object({
  plans: z.record(planEnumSchema, z.array(permissionNameSchema)),
});

export function generatePermissionEnumSchema() {
  const permissionGenPath = resolve(__dirname, '../../../src/permissions.gen.ts');
  const plansSchemaPath = resolve(__dirname, '../../../src/plans.schema.json');

  const permissionNames = Object.keys(permissionsConfig.permissions);

  // Zod enum を生成
  const content = `/* eslint-disable prettier/prettier */
import z from 'zod';

export const permissionEnumSchema = z.enum(${JSON.stringify(permissionNames)});
export type PermissionEnum = z.infer<typeof permissionEnumSchema>;
`;

  const jsonSchemaTemplate = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $defs: {
      permission: {
        type: 'string',
        enum: [...permissionNames, '*'],
      },
    },
    type: 'object',
    properties: {
      plans: {
        type: 'object',
        properties: {
          trial: {
            type: 'array',
            items: { $ref: '#/$defs/permission' },
          },
          guest: {
            type: 'array',
            items: { $ref: '#/$defs/permission' },
          },
          basic: {
            type: 'array',
            items: { $ref: '#/$defs/permission' },
          },
          pro: {
            type: 'array',
            items: { $ref: '#/$defs/permission' },
          },
          admin: {
            type: 'array',
            items: { $ref: '#/$defs/permission' },
          },
        },
        required: ['trial', 'guest', 'basic', 'pro', 'admin'],
        additionalProperties: false,
      },
    },
    required: ['plans'],
    additionalProperties: false,
  };

  writeFileSync(permissionGenPath, content);
  writeFileSync(plansSchemaPath, JSON.stringify(jsonSchemaTemplate, null, 2));
}
