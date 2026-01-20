import z from 'zod';

const sensors = [
  'accelerometer',
  'linear_acceleration',
  'gyroscope',
  'barometer',
  'magnetometer',
  'location',
  'light',
] as const;

export const sensorsEnumSchema = z.enum(sensors);
export type SensorsEnum = z.infer<typeof sensorsEnumSchema>;
