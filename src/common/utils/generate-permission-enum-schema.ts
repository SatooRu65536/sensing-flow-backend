import { writeFileSync } from 'fs';
import permissionsConfig from '@/permissions.json';
import { planEnumSchema } from '@/plans-config/plans-config.schema';

export function generatePermissionEnumSchema(permissionsSchemaPath: string, plansSchemaPath: string) {
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
  writeFileSync(permissionsSchemaPath, content);
  writeFileSync(plansSchemaPath, JSON.stringify(jsonSchemaTemplate, null, 2));
}
