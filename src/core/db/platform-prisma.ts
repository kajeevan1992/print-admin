import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { allowSelfSignedDbCertificatesForNode, normalizePrismaPostgresUrl } from './connection-string';

const globalForPrisma = globalThis as unknown as { platformPrisma?: PrismaClientType };

function firstConfiguredDatabaseUrl() {
  const candidates = [
    ['DATABASE_URL', process.env.DATABASE_URL],
    ['POSTGRES_PRISMA_URL', process.env.POSTGRES_PRISMA_URL],
    ['POSTGRES_URL', process.env.POSTGRES_URL],
    ['POSTGRES_URL_NON_POOLING', process.env.POSTGRES_URL_NON_POOLING],
  ] as const;
  return candidates.find(([, value]) => Boolean(value)) || [null, ''] as const;
}

export function getRuntimeDatabaseUrl() {
  return firstConfiguredDatabaseUrl()[1] || '';
}

export function getRuntimeDatabaseInfo() {
  const [source, raw] = firstConfiguredDatabaseUrl();
  if (!raw) return { source: null, configured: false };
  try {
    const url = new URL(raw);
    return {
      source,
      configured: true,
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.replace(/^\//, ''),
      sslmode: url.searchParams.get('sslmode') || '',
      pgbouncer: url.searchParams.get('pgbouncer') || '',
      userPresent: Boolean(url.username),
      passwordPresent: Boolean(url.password),
    };
  } catch {
    return { source, configured: true, parseError: true };
  }
}

function createPlatformPrisma(): PrismaClientType {
  allowSelfSignedDbCertificatesForNode();
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  const dbUrl = getRuntimeDatabaseUrl();
  return new PrismaClient({
    datasources: dbUrl ? { db: { url: normalizePrismaPostgresUrl(dbUrl) } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export function getPlatformPrisma(): PrismaClientType {
  if (!globalForPrisma.platformPrisma) globalForPrisma.platformPrisma = createPlatformPrisma();
  return globalForPrisma.platformPrisma;
}

export const platformPrisma = new Proxy({}, { get(_target, property) { return (getPlatformPrisma() as any)[property as keyof PrismaClientType]; } }) as PrismaClientType;
