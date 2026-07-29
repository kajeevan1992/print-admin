import type { PrismaClient as PrismaClientType } from '@prisma/client';
import type { TenantContext, TenantDatabaseConnection } from '../tenant/types';
import { allowSelfSignedDbCertificatesForNode, buildPostgresConnectionString, normalizePrismaPostgresUrl } from './connection-string';
import { getDatabaseConnection, listDatabaseConnections, toConnectionInput } from './database-connection-store';
import { platformPrisma } from './platform-prisma';

const globalForTenantPrisma = globalThis as unknown as {
  tenantPrismaClients?: Map<string, PrismaClientType>;
};

const tenantPrismaClients = globalForTenantPrisma.tenantPrismaClients ?? new Map<string, PrismaClientType>();
globalForTenantPrisma.tenantPrismaClients = tenantPrismaClients;

export type TenantPrismaResolution = {
  ok: boolean;
  client?: PrismaClientType;
  connection?: TenantDatabaseConnection;
  message: string;
  usingPlatformDatabase?: boolean;
};

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function clientCacheKey(record: TenantDatabaseConnection) {
  return `${record.id}:${record.updatedAt}:${record.status}`;
}

function retireStaleTenantClients(record: TenantDatabaseConnection, keepKey: string) {
  for (const [key, client] of tenantPrismaClients.entries()) {
    if (!key.startsWith(`${record.id}:`) || key === keepKey) continue;
    tenantPrismaClients.delete(key);
    void client.$disconnect().catch(() => undefined);
  }
}

function makeTenantClient(record: TenantDatabaseConnection) {
  const key = clientCacheKey(record);
  const cached = tenantPrismaClients.get(key);
  if (cached) return cached;

  retireStaleTenantClients(record, key);
  const url = normalizePrismaPostgresUrl(buildPostgresConnectionString(toConnectionInput(record)), {
    connectionLimit: positiveInteger(process.env.PRISMA_TENANT_CONNECTION_LIMIT, 1),
    poolTimeoutSeconds: positiveInteger(process.env.PRISMA_POOL_TIMEOUT_SECONDS, 20),
    connectTimeoutSeconds: positiveInteger(process.env.PRISMA_CONNECT_TIMEOUT_SECONDS, 10),
  });
  allowSelfSignedDbCertificatesForNode();
  // Lazy require prevents Next.js build-time route collection from loading
  // @prisma/client before the generated client exists.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  tenantPrismaClients.set(key, client);
  return client;
}

function shouldUsePlatformDatabaseFallback() {
  return process.env.TENANT_DB_FALLBACK_TO_PLATFORM !== 'false';
}

function platformDatabaseFallback(ctx: TenantContext): TenantPrismaResolution {
  return {
    ok: true,
    client: platformPrisma,
    message: `Tenant ${ctx.tenantId} is using the main platform database because no separate tenant database connection is configured.`,
    usingPlatformDatabase: true,
  };
}

export async function findTenantDatabaseConnection(ctx: TenantContext) {
  if (ctx.databaseConnectionId) {
    return getDatabaseConnection(ctx.databaseConnectionId);
  }

  const records = await listDatabaseConnections();
  const active = records.filter((record) => record.status === 'connected' || record.status === 'untested');

  if (ctx.siteId) {
    const siteRecord = active.find(
      (record) => record.scope === 'site' && record.tenantId === ctx.tenantId && record.siteId === ctx.siteId
    );
    if (siteRecord) return siteRecord;
  }

  return (
    active.find((record) => record.scope === 'tenant' && record.tenantId === ctx.tenantId) ||
    active.find((record) => record.tenantId === ctx.tenantId) ||
    null
  );
}

export async function getTenantPrisma(ctx: TenantContext): Promise<TenantPrismaResolution> {
  const connection = await findTenantDatabaseConnection(ctx);

  if (!connection) {
    if (shouldUsePlatformDatabaseFallback()) return platformDatabaseFallback(ctx);
    return {
      ok: false,
      message: `No tenant database connection configured for tenant ${ctx.tenantId}.`,
    };
  }

  if (!connection.encryptedPassword) {
    if (shouldUsePlatformDatabaseFallback()) return platformDatabaseFallback(ctx);
    return {
      ok: false,
      connection,
      message: `Tenant database connection ${connection.label} is missing a password.`,
    };
  }

  return {
    ok: true,
    client: makeTenantClient(connection),
    connection,
    message: `Resolved tenant database ${connection.label}.`,
  };
}
