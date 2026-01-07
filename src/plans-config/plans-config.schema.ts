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

export const rateLimitStringSchema = z
  .string()
  .regex(
    /^(\*|\d+\/(1?(sec|min|hour|day)|[2-9]\d*(secs|mins|hours|days)))$/,
    'Rate limit must be in the format "1/1sec", "*/1min", or "1/2hours"',
  )
  .transform((val) => {
    if (val === '*') return undefined;

    const [countStr, unitStr] = val.split('/'); // "5/2hours" → ["5","2hours"]
    const count = Number(countStr);

    // 数字部分と単位部分を分離
    const match = unitStr.match(/^(\d*)(sec|min|hour|day)s?$/);
    if (!match) throw new Error('Invalid unit');

    const [, numStr, unit] = match;
    const unitNum = numStr ? Number(numStr) : 1; // 1sec の場合 numStr は空

    switch (unit) {
      case 'sec':
        return {
          count,
          limitSec: unitNum,
        };
      case 'min':
        return {
          count,
          limitSec: unitNum * 60,
        };
      case 'hour':
        return {
          count,
          limitSec: unitNum * 60 * 60,
        };
      case 'day':
        return {
          count,
          limitSec: unitNum * 60 * 60 * 24,
        };
      default:
        throw new Error('Unknown unit');
    }
  });
export type RateLimit = z.infer<typeof rateLimitStringSchema>;

export const plansConfigSchema = z.strictObject({
  plans: z.record(
    planEnumSchema,
    z
      .strictObject({
        selectable: z.boolean().optional().default(true),
        permissions: z.record(permissionNameSchema, rateLimitStringSchema),
      })
      .optional(),
  ),
});
export const plansConfigRawSchema = z.strictObject({
  plans: z.record(
    planEnumSchema,
    z
      .strictObject({
        selectable: z.boolean().optional().default(true),
        permissions: z.record(permissionNameSchema, z.string()),
      })
      .optional(),
  ),
});
export type PlansConfigRaw = z.infer<typeof plansConfigRawSchema>;

export function generatePermissionEnumSchema() {
  const permissionGenPath = resolve(__dirname, '../../src/permissions.gen.ts');
  const plansSchemaPath = resolve(__dirname, '../../src/plans.schema.json');

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
            selectable: {
              type: 'boolean',
            },
            permissions: {
              type: 'object',
              propertyNames: {
                type: 'string',
                enum: [...permissionNames, '*'],
              },
              additionalProperties: {
                anyOf: [
                  {
                    type: 'string',
                    pattern: '^(\\*|\\d+/(1?(sec|min|hour|day)|[2-9]\\d*(secs|mins|hours|days)))$',
                  },
                ],
              },
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
