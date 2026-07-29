import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { allowSelfSignedDbCertificatesForNode, normalizePrismaPostgresUrl } from './connection-string';

const globalForPrisma = globalThis as unknown as { platformPrisma?: PrismaClientType };

function cleanUrl(value: string | undefined) {
  let text = String(value || '').trim();
  const pgLong = text.indexOf('postgresql://');
  const pgShort = text.indexOf('postgres://');
  const start = pgLong >= 0 ? pgLong : pgShort >= 0 ? pgShort : -1;
  if (start > 0) text = text.slice(start);
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) text = text.slice(1, -1).trim();
  if (text.endsWith('"') || text.endsWith("'")) text = text.slice(0, -1).trim();
  return text;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function firstConfiguredDatabaseUrl() {
  const candidates = [
    ['AIVEN_DATABASE_URL', cleanUrl(process.env.AIVEN_DATABASE_URL)],
    ['DATABASE_URL', cleanUrl(process.env.DATABASE_URL)],
    ['POSTGRES_PRISMA_URL', cleanUrl(process.env.POSTGRES_PRISMA_URL)],
    ['POSTGRES_URL', cleanUrl(process.env.POSTGRES_URL)],
    ['POSTGRES_URL_NON_POOLING', cleanUrl(process.env.POSTGRES_URL_NON_POOLING)],
  ] as const;
  return candidates.find(([, value]) => Boolean(value)) || [null, ''] as const;
}

export function getRuntimeDatabaseUrl() { return firstConfiguredDatabaseUrl()[1] || ''; }
export function getRuntimeDatabaseInfo() { const [source, raw] = firstConfiguredDatabaseUrl(); if (!raw) return { source: null, configured: false }; try { const url = new URL(raw); return { source, configured: true, protocol: url.protocol.replace(':', ''), host: url.hostname, port: url.port || '5432', database: url.pathname.replace(/^\//, ''), sslmode: url.searchParams.get('sslmode') || '', pgbouncer: url.searchParams.get('pgbouncer') || '', connectionLimit: url.searchParams.get('connection_limit') || '', userPresent: Boolean(url.username), passwordPresent: Boolean(url.password) }; } catch { return { source, configured: true, parseError: true, startsWith: raw.slice(0, 18), length: raw.length }; } }

function createPlatformPrisma(): PrismaClientType {
  allowSelfSignedDbCertificatesForNode();
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  const dbUrl = getRuntimeDatabaseUrl();
  const url = dbUrl ? normalizePrismaPostgresUrl(dbUrl, {
    connectionLimit: positiveInteger(process.env.PRISMA_PLATFORM_CONNECTION_LIMIT || process.env.PRISMA_CONNECTION_LIMIT, 3),
    poolTimeoutSeconds: positiveInteger(process.env.PRISMA_POOL_TIMEOUT_SECONDS, 20),
    connectTimeoutSeconds: positiveInteger(process.env.PRISMA_CONNECT_TIMEOUT_SECONDS, 10),
  }) : '';
  if (url) process.env.DATABASE_URL = url;
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export function getPlatformPrisma(): PrismaClientType {
  if (!globalForPrisma.platformPrisma) globalForPrisma.platformPrisma = createPlatformPrisma();
  return globalForPrisma.platformPrisma;
}

export async function disconnectPlatformPrisma() {
  if (!globalForPrisma.platformPrisma) return;
  await globalForPrisma.platformPrisma.$disconnect().catch(() => undefined);
  globalForPrisma.platformPrisma = undefined;
}

export const platformPrisma = new Proxy({}, { get(_target, property) { return (getPlatformPrisma() as any)[property as keyof PrismaClientType]; } }) as PrismaClientType;
