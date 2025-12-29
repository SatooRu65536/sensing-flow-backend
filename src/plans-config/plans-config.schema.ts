import { writeFileSync } from 'fs';
import { resolve } from 'path';
import z from 'zod';
import permissionsConfig from '../permissions.json';
import { createSelectSchema } from 'drizzle-zod';
import { UserSchema } from '@/_schema';

const userZodSchema = createSelectSchema(UserSchema);

export const planEnumSchema = userZodSchema.shape.plan;
export type PlanEnum = z.infer<typeof planEnumSchema>;

export const permissionSchema = z.strictObject({
  resource: z.string(),
  action: z.string(),
  description: z.string(),
});
export const permissionNameSchema = z.string().refine((val) => val.includes(':'), {
  message: 'Permission name must be in the format "action:resource"',
});

export const permissionsConfigSchema = z.strictObject({
  permissions: z.record(permissionNameSchema, z.string()),
});
export type PermissionsConfig = z.infer<typeof permissionsConfigSchema>;

export const plansConfigSchema = z.strictObject({
  plans: z.record(
    planEnumSchema,
    z.strictObject({
      selectable: z.boolean().optional().default(true),
      permissions: z.array(permissionNameSchema),
    }),
  ),
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
    type: 'object',
    properties: {
      plans: {
        type: 'object',
        propertyNames: {
          enum: planEnumSchema.options,
        },
        additionalProperties: {
          type: 'object',
          properties: {
            permissions: {
              type: 'array',
              items: {
                type: 'string',
                enum: [...permissionNames, '*'],
              },
            },
            selectable: {
              type: 'boolean',
            },
          },
          required: ['selectable', 'permissions'],
          additionalProperties: false,
        },
      },
    },
    required: ['plans'],
    additionalProperties: false,
  };
  writeFileSync(permissionGenPath, content);
  writeFileSync(plansSchemaPath, JSON.stringify(jsonSchemaTemplate, null, 2));
}
