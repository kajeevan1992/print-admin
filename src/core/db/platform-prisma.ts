import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { allowSelfSignedDbCertificatesForNode, normalizePrismaPostgresUrl } from './connection-string';

const globalForPrisma = globalThis as unknown as {
  platformPrisma?: PrismaClientType;
};

function runtimeDatabaseUrl() {
  return (
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ''
  );
}

function createPlatformPrisma(): PrismaClientType {
  allowSelfSignedDbCertificatesForNode();
  // Lazy require prevents Next.js build-time route collection from loading
  // @prisma/client before the generated client exists.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  const dbUrl = runtimeDatabaseUrl();
  return new PrismaClient({
    datasources: dbUrl
      ? { db: { url: normalizePrismaPostgresUrl(dbUrl) } }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export function getPlatformPrisma(): PrismaClientType {
  if (!globalForPrisma.platformPrisma) {
    globalForPrisma.platformPrisma = createPlatformPrisma();
  }
  return globalForPrisma.platformPrisma;
}

export const platformPrisma = new Proxy(
  {},
  {
    get(_target, property) {
      return (getPlatformPrisma() as any)[property as keyof PrismaClientType];
    },
  }
) as PrismaClientType;
