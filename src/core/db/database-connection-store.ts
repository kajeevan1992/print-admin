import fs from 'fs/promises';
import path from 'path';
import { decryptSecret, encryptSecret } from '../security/encryption';
import type { TenantDatabaseConnection } from '../tenant/types';

export type DatabaseConnectionInput = {
  tenantId: string;
  siteId?: string;
  scope: 'tenant' | 'site';
  label: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  sslMode: 'disable' | 'prefer' | 'require';
};

const STORE_PATH = process.env.PLATFORM_DB_CONNECTION_STORE_PATH || '/tmp/print-platform-db-connections.json';

async function getPrisma() {
  try {
    const mod = await import('./platform-prisma');
    const prisma: any = mod.platformPrisma;
    if (prisma?.tenantDatabaseConnection) return prisma;
    return null;
  } catch {
    return null;
  }
}

async function readFileStore(): Promise<TenantDatabaseConnection[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFileStore(records: TenantDatabaseConnection[]) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(records, null, 2));
}

function now() {
  return new Date().toISOString();
}

function createId() {
  return `db_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function mapPrismaRecord(record: any): TenantDatabaseConnection {
  return {
    id: record.id,
    tenantId: record.tenantId,
    siteId: record.siteId || undefined,
    scope: record.scope === 'site' ? 'site' : 'tenant',
    label: record.label,
    provider: 'postgres',
    host: record.host,
    port: Number(record.port || 5432),
    database: record.database,
    username: record.username,
    encryptedPassword: record.encryptedPassword || undefined,
    sslMode: record.sslMode === 'disable' || record.sslMode === 'require' ? record.sslMode : 'prefer',
    status: record.status === 'connected' || record.status === 'failed' ? record.status : 'untested',
    lastTestedAt: record.lastTestedAt ? new Date(record.lastTestedAt).toISOString() : undefined,
    createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : now(),
    updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : now(),
  };
}

export async function listDatabaseConnections() {
  const prisma = await getPrisma();
  if (prisma) {
    try {
      const records = await prisma.tenantDatabaseConnection.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return records.map(mapPrismaRecord);
    } catch {
      // fall back to file
    }
  }
  return readFileStore();
}

export async function getDatabaseConnection(id: string) {
  const prisma = await getPrisma();
  if (prisma) {
    try {
      const record = await prisma.tenantDatabaseConnection.findUnique({ where: { id } });
      return record ? mapPrismaRecord(record) : null;
    } catch {
      // fall back to file
    }
  }

  const records = await readFileStore();
  return records.find((record) => record.id === id) || null;
}

export async function upsertDatabaseConnection(input: DatabaseConnectionInput & { id?: string }) {
  const encryptedPassword = input.password ? encryptSecret(input.password) : undefined;
  const prisma = await getPrisma();

  if (prisma) {
    try {
      const existing = input.id
        ? await prisma.tenantDatabaseConnection.findUnique({ where: { id: input.id } })
        : null;

      const record = existing
        ? await prisma.tenantDatabaseConnection.update({
            where: { id: existing.id },
            data: {
              tenantId: input.tenantId,
              siteId: input.siteId || null,
              scope: input.scope,
              label: input.label,
              provider: 'postgres',
              host: input.host,
              port: Number(input.port || 5432),
              database: input.database,
              username: input.username,
              ...(encryptedPassword ? { encryptedPassword } : {}),
              sslMode: input.sslMode || 'prefer',
            },
          })
        : await prisma.tenantDatabaseConnection.create({
            data: {
              tenantId: input.tenantId,
              siteId: input.siteId || null,
              scope: input.scope,
              label: input.label,
              provider: 'postgres',
              host: input.host,
              port: Number(input.port || 5432),
              database: input.database,
              username: input.username,
              encryptedPassword,
              sslMode: input.sslMode || 'prefer',
              status: 'untested',
            },
          });

      return mapPrismaRecord(record);
    } catch {
      // fall back to file
    }
  }

  const records = await readFileStore();
  const existing = input.id ? records.find((record) => record.id === input.id) : null;
  const record: TenantDatabaseConnection = {
    id: input.id || createId(),
    tenantId: input.tenantId,
    siteId: input.siteId || undefined,
    scope: input.scope,
    label: input.label,
    provider: 'postgres',
    host: input.host,
    port: Number(input.port || 5432),
    database: input.database,
    username: input.username,
    encryptedPassword: encryptedPassword || existing?.encryptedPassword,
    sslMode: input.sslMode || 'prefer',
    status: existing?.status || 'untested',
    lastTestedAt: existing?.lastTestedAt,
    createdAt: existing?.createdAt || now(),
    updatedAt: now(),
  };

  const next = existing
    ? records.map((item) => (item.id === record.id ? record : item))
    : [record, ...records];

  await writeFileStore(next);
  return record;
}

export async function updateDatabaseConnectionStatus(id: string, status: TenantDatabaseConnection['status']) {
  const prisma = await getPrisma();

  if (prisma) {
    try {
      const record = await prisma.tenantDatabaseConnection.update({
        where: { id },
        data: {
          status,
          lastTestedAt: new Date(),
        },
      });
      return mapPrismaRecord(record);
    } catch {
      // fall back to file
    }
  }

  const records = await readFileStore();
  const next = records.map((record) =>
    record.id === id ? { ...record, status, lastTestedAt: now(), updatedAt: now() } : record
  );
  await writeFileStore(next);
  return next.find((record) => record.id === id) || null;
}

export async function deleteDatabaseConnection(id: string) {
  const prisma = await getPrisma();
  if (prisma) {
    try {
      await prisma.tenantDatabaseConnection.delete({ where: { id } });
      return { ok: true };
    } catch {
      // fall back to file
    }
  }

  const records = await readFileStore();
  await writeFileStore(records.filter((record) => record.id !== id));
  return { ok: true };
}

export function toConnectionInput(record: TenantDatabaseConnection) {
  return {
    host: record.host,
    port: record.port,
    database: record.database,
    username: record.username,
    password: record.encryptedPassword ? decryptSecret(record.encryptedPassword) : '',
    sslMode: record.sslMode,
  };
}

export function safeDatabaseConnection(record: TenantDatabaseConnection) {
  const { encryptedPassword: _encryptedPassword, ...safe } = record;
  return safe;
}
