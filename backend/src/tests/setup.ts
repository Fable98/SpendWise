import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/prisma';

beforeAll(async () => {
  // Verify DB connection is alive before tests
  await prisma.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  // Clean up smoke-test user if it exists
  await prisma.user.deleteMany({
    where: { email: 'smoketest@example.com' },
  });
  await prisma.$disconnect();
});
