import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  platformPrisma?: PrismaClient;
};

export const platformPrisma =
  globalForPrisma.platformPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.platformPrisma = platformPrisma;
}
