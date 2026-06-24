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
export function getRuntimeDatabaseInfo() { const [source, raw] = firstConfiguredDatabaseUrl(); if (!raw) return { source: null, configured: false }; try { const url = new URL(raw); return { source, configured: true, protocol: url.protocol.replace(':', ''), host: url.hostname, port: url.port || '5432', database: url.pathname.replace(/^\//, ''), sslmode: url.searchParams.get('sslmode') || '', pgbouncer: url.searchParams.get('pgbouncer') || '', userPresent: Boolean(url.username), passwordPresent: Boolean(url.password) }; } catch { return { source, configured: true, parseError: true, startsWith: raw.slice(0, 18), length: raw.length }; } }
function createPlatformPrisma(): PrismaClientType { allowSelfSignedDbCertificatesForNode(); const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client'); const dbUrl = getRuntimeDatabaseUrl(); if (dbUrl) process.env.DATABASE_URL = dbUrl; return new PrismaClient({ datasources: dbUrl ? { db: { url: normalizePrismaPostgresUrl(dbUrl) } } : undefined, log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] }); }
export function getPlatformPrisma(): PrismaClientType { if (!globalForPrisma.platformPrisma) globalForPrisma.platformPrisma = createPlatformPrisma(); return globalForPrisma.platformPrisma; }
export async function disconnectPlatformPrisma() { if (!globalForPrisma.platformPrisma) return; await globalForPrisma.platformPrisma.$disconnect().catch(() => undefined); globalForPrisma.platformPrisma = undefined; }
export const platformPrisma = new Proxy({}, { get(_target, property) { return (getPlatformPrisma() as any)[property as keyof PrismaClientType]; } }) as PrismaClientType;
