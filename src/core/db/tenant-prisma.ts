import { PrismaClient } from '@prisma/client';
import type { TenantContext, TenantDatabaseConnection } from '../tenant/types';
import { buildPostgresConnectionString } from './connection-string';
import { getDatabaseConnection, listDatabaseConnections, toConnectionInput } from './database-connection-store';

const globalForTenantPrisma = globalThis as unknown as {
  tenantPrismaClients?: Map<string, PrismaClient>;
};

const tenantPrismaClients = globalForTenantPrisma.tenantPrismaClients ?? new Map<string, PrismaClient>();

if (process.env.NODE_ENV !== 'production') {
  globalForTenantPrisma.tenantPrismaClients = tenantPrismaClients;
}

export type TenantPrismaResolution = {
  ok: boolean;
  client?: PrismaClient;
  connection?: TenantDatabaseConnection;
  message: string;
};

function clientCacheKey(record: TenantDatabaseConnection) {
  return `${record.id}:${record.updatedAt}:${record.status}`;
}

function makeTenantClient(record: TenantDatabaseConnection) {
  const key = clientCacheKey(record);
  const cached = tenantPrismaClients.get(key);
  if (cached) return cached;

  const url = buildPostgresConnectionString(toConnectionInput(record));
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  tenantPrismaClients.set(key, client);
  return client;
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
    return {
      ok: false,
      message: `No tenant database connection configured for tenant ${ctx.tenantId}.`,
    };
  }

  if (!connection.encryptedPassword) {
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
