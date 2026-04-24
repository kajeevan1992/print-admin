import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import type { TenantDatabaseConnection } from '../tenant/types';
import { buildPostgresConnectionString } from './connection-string';
import { toConnectionInput } from './database-connection-store';
import { withPgClient } from './tenant-schema';

export type BackupRunResult = {
  ok: boolean;
  message: string;
  backupId: string;
  createdAt: string;
  filePath?: string;
};

const BACKUP_DIR = process.env.PLATFORM_DB_BACKUP_DIR || '/tmp/print-platform-db-backups';

function backupId(record: TenantDatabaseConnection) {
  return `backup_${record.tenantId}_${Date.now()}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

async function commandExists(command: string) {
  const paths = (process.env.PATH || '').split(path.delimiter);
  for (const item of paths) {
    try {
      await fs.access(path.join(item, command));
      return true;
    } catch {}
  }
  return false;
}

async function runPgDump(record: TenantDatabaseConnection, filePath: string) {
  const connectionString = buildPostgresConnectionString(toConnectionInput(record));
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pg_dump', ['--clean', '--if-exists', '--no-owner', '--no-privileges', connectionString], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    child.stderr.on('data', () => undefined);
    child.on('error', reject);
    child.on('close', async (code) => {
      if (code !== 0) reject(new Error(`pg_dump failed with exit code ${code}.`));
      else {
        await fs.writeFile(filePath, Buffer.concat(chunks));
        resolve();
      }
    });
  });
}

async function runJsonBackup(record: TenantDatabaseConnection, filePath: string) {
  const input = toConnectionInput(record);
  const tables = ['Tenant', 'Category', 'Product', 'CoreCatalogRecord'];
  const data = await withPgClient(input, async (client) => {
    const result: Record<string, unknown[]> = {};
    for (const table of tables) {
      try {
        const rows = await client.query(`SELECT * FROM "${table}"`);
        result[table] = rows.rows;
      } catch {
        result[table] = [];
      }
    }
    return result;
  });
  await fs.writeFile(filePath, JSON.stringify({ createdAt: new Date().toISOString(), tenantId: record.tenantId, data }, null, 2));
}

export async function runDatabaseBackup(record: TenantDatabaseConnection): Promise<BackupRunResult> {
  const id = backupId(record);
  const createdAt = new Date().toISOString();
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  try {
    const hasPgDump = await commandExists('pg_dump');
    const filePath = path.join(BACKUP_DIR, `${id}.${hasPgDump ? 'sql' : 'json'}`);
    if (hasPgDump) await runPgDump(record, filePath);
    else await runJsonBackup(record, filePath);

    return {
      ok: true,
      message: hasPgDump ? 'Database backup completed with pg_dump.' : 'Database backup completed with JSON export fallback.',
      backupId: id,
      createdAt,
      filePath,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Database backup failed.',
      backupId: id,
      createdAt,
    };
  }
}
