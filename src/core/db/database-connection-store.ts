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

export async function listDatabaseConnections() {
  return readFileStore();
}

export async function getDatabaseConnection(id: string) {
  const records = await readFileStore();
  return records.find((record) => record.id === id) || null;
}

export async function upsertDatabaseConnection(input: DatabaseConnectionInput & { id?: string }) {
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
    encryptedPassword: input.password ? encryptSecret(input.password) : existing?.encryptedPassword,
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
  const records = await readFileStore();
  const next = records.map((record) =>
    record.id === id ? { ...record, status, lastTestedAt: now(), updatedAt: now() } : record
  );
  await writeFileStore(next);
  return next.find((record) => record.id === id) || null;
}

export async function deleteDatabaseConnection(id: string) {
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

/**
 * Production note:
 * This file-store keeps the current Coolify deployment simple while the core is being unified.
 * The next hardening step is moving these records into the Platform DB with a Prisma model:
 * TenantDatabaseConnection(id, tenantId, siteId, scope, label, host, port, database, username,
 * encryptedPassword, sslMode, status, lastTestedAt, createdAt, updatedAt).
 */
