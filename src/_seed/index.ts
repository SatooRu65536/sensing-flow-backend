import { seedUsers } from './users';

export async function seed() {
  await seedUsers();
}
