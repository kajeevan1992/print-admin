import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { allowSelfSignedDbCertificatesForNode, normalizePrismaPostgresUrl } from '@/core/db/connection-string';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

function createPrismaClient(): PrismaClientType {
  allowSelfSignedDbCertificatesForNode();
  // Lazy require keeps Next.js build-time route collection from loading
  // @prisma/client before `prisma generate` has run in Coolify/Nixpacks.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  return new PrismaClient({
    datasources: process.env.DATABASE_URL
      ? { db: { url: normalizePrismaPostgresUrl(process.env.DATABASE_URL) } }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });
}

export function getPrisma(): PrismaClientType {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy(
  {},
  {
    get(_target, property) {
      return (getPrisma() as any)[property as keyof PrismaClientType];
    },
  }
) as PrismaClientType;
