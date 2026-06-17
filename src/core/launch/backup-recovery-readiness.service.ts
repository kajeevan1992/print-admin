import { existsSync } from 'fs';
import path from 'path';
import { platformPrisma } from '@/core/db/platform-prisma';
import { listDatabaseConnections } from '@/core/db/database-connection-store';

export type BackupRecoverySeverity = 'pass' | 'warning' | 'error' | 'info';
export type BackupRecoveryCheck = {
  id: string;
  category: 'database' | 'backup-hook' | 'vercel' | 'restore-plan' | 'tenant-mode' | 'operations';
  severity: BackupRecoverySeverity;
  label: string;
  detail: string;
  action?: string;
};

function c(id: string, category: BackupRecoveryCheck['category'], severity: BackupRecoverySeverity, label: string, detail: string, action = ''): BackupRecoveryCheck {
  return { id, category, severity, label, detail, action };
}
function pass(id: string, category: BackupRecoveryCheck['category'], label: string, detail: string, action = '') { return c(id, category, 'pass', label, detail, action); }
function warn(id: string, category: BackupRecoveryCheck['category'], label: string, detail: string, action = '') { return c(id, category, 'warning', label, detail, action); }
function fail(id: string, category: BackupRecoveryCheck['category'], label: string, detail: string, action = '') { return c(id, category, 'error', label, detail, action); }
function info(id: string, category: BackupRecoveryCheck['category'], label: string, detail: string, action = '') { return c(id, category, 'info', label, detail, action); }
function env(name: string) { return String(process.env[name] || '').trim(); }
function hasEnv(name: string) { return Boolean(env(name)); }

async function databaseChecks() {
  const checks: BackupRecoveryCheck[] = [];
  if (!hasEnv('DATABASE_URL')) {
    checks.push(fail('database-url', 'database', 'Main database not configured', 'DATABASE_URL is missing.', 'Add the Vercel Postgres/Neon DATABASE_URL.'));
    return { checks, tableCounts: {} as Record<string, number> };
  }
  checks.push(pass('database-url', 'database', 'Main database configured', 'DATABASE_URL is present.'));
  const tableCounts: Record<string, number> = {};
  for (const table of ['Tenant', 'User', 'CoreCatalogRecord']) {
    try {
      const result = await platformPrisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(`SELECT COUNT(*)::bigint AS count FROM "${table}"`);
      tableCounts[table] = Number(result?.[0]?.count || 0);
      checks.push(pass(`table-${table}`, 'database', `${table} table readable`, `${table} has ${tableCounts[table]} rows.`));
    } catch {
      checks.push(warn(`table-${table}`, 'database', `${table} table not readable`, `Could not count ${table}.`, 'Run Prisma db push/migrate and confirm schema.'));
    }
  }
  return { checks, tableCounts };
}

async function connectionChecks() {
  const checks: BackupRecoveryCheck[] = [];
  const records = await listDatabaseConnections().catch(() => []);
  if (records.length) checks.push(pass('tenant-db-records', 'tenant-mode', 'Database Manager records exist', `${records.length} saved tenant/site database connection records found.`));
  else checks.push(info('tenant-db-records', 'tenant-mode', 'No separate tenant database records', 'HOLO is currently using the main platform database fallback, which is expected for this launch.'));
  if (env('TENANT_DB_FALLBACK_TO_PLATFORM') === 'false') checks.push(info('tenant-db-fallback', 'tenant-mode', 'Strict tenant database mode', 'Tenant fallback is explicitly disabled.'));
  else checks.push(pass('tenant-db-fallback', 'tenant-mode', 'Shared main database mode', 'Tenant fallback to the main platform database is enabled/default.'));
  return { checks, records: records.map((record) => ({ id: record.id, label: record.label, tenantId: record.tenantId, scope: record.scope, status: record.status })) };
}

function hookChecks() {
  const checks: BackupRecoveryCheck[] = [];
  const backupRoute = existsSync(path.join(process.cwd(), 'app/api/internal/database-connections/backup/route.ts'));
  const backupManager = existsSync(path.join(process.cwd(), 'src/core/db/backup-manager.ts'));
  if (backupRoute && backupManager) checks.push(pass('backup-hook-files', 'backup-hook', 'Existing backup hook found', 'Database Manager backup hook and backup manager are present.'));
  else checks.push(warn('backup-hook-files', 'backup-hook', 'Backup hook not fully confirmed', 'Could not confirm both backup route and backup manager files.', 'Restore database manager backup hook files.'));
  const dir = env('PLATFORM_DB_BACKUP_DIR') || '/tmp/print-platform-db-backups';
  if (dir.startsWith('/tmp')) checks.push(warn('backup-dir-temp', 'vercel', 'Backup hook writes to temporary storage', `Current backup directory is ${dir}. Vercel /tmp is not durable.`, 'Use provider snapshots/exports for production backup, or configure durable object storage.'));
  else checks.push(info('backup-dir-temp', 'backup-hook', 'Custom backup directory configured', `Backup directory: ${dir}. Confirm it is durable in your hosting environment.`));
  return checks;
}

function restorePlanChecks() {
  const checks: BackupRecoveryCheck[] = [];
  if (hasEnv('RECOVERY_CONTACT') || hasEnv('LAUNCH_OWNER_EMAIL') || hasEnv('ADMIN_EMAIL')) checks.push(pass('recovery-contact', 'restore-plan', 'Recovery contact configured', 'A recovery/admin contact environment variable is present.'));
  else checks.push(warn('recovery-contact', 'restore-plan', 'Recovery contact not configured', 'No recovery contact env was found.', 'Set RECOVERY_CONTACT or ADMIN_EMAIL.'));
  if (hasEnv('BACKUP_PROVIDER') || hasEnv('DATABASE_BACKUP_PROVIDER')) checks.push(pass('backup-provider-note', 'restore-plan', 'Backup provider noted', 'Backup provider environment variable is present.'));
  else checks.push(warn('backup-provider-note', 'restore-plan', 'Backup provider not noted', 'No backup provider marker was found.', 'Document Vercel/Neon backup method in BACKUP_PROVIDER.'));
  checks.push(info('restore-runbook', 'restore-plan', 'Restore runbook needed', 'Keep a written restore process: snapshot/export source, target DB, env swap, Prisma check, smoke test.', 'Add restore runbook notes before public launch.'));
  return checks;
}

export async function buildBackupRecoveryReadiness() {
  const db = await databaseChecks();
  const connections = await connectionChecks();
  const checks: BackupRecoveryCheck[] = [
    ...db.checks,
    ...connections.checks,
    ...hookChecks(),
    ...restorePlanChecks(),
  ];
  if (process.env.VERCEL) checks.push(info('vercel-runtime', 'vercel', 'Vercel runtime detected', 'Use managed database snapshots/exports as the source of truth. Do not rely on runtime file backups.'));
  const summary = checks.reduce((acc, item) => {
    acc.checks += 1;
    acc[item.severity] += 1;
    return acc;
  }, { checks: 0, pass: 0, warning: 0, error: 0, info: 0 } as Record<BackupRecoverySeverity | 'checks', number>);
  const score = Math.max(0, Math.min(100, 100 - summary.error * 25 - summary.warning * 8));
  const ready = summary.error === 0;
  const nextActions = checks.filter((item) => item.severity === 'error' || item.severity === 'warning').slice(0, 10).map((item) => ({ label: item.label, detail: item.detail, action: item.action, severity: item.severity, category: item.category }));
  return {
    ready,
    score,
    generatedAt: new Date().toISOString(),
    summary,
    environment: {
      vercel: Boolean(process.env.VERCEL),
      backupDir: env('PLATFORM_DB_BACKUP_DIR') || '/tmp/print-platform-db-backups',
      backupProvider: env('BACKUP_PROVIDER') || env('DATABASE_BACKUP_PROVIDER') || '',
      tenantDbMode: env('TENANT_DB_FALLBACK_TO_PLATFORM') === 'false' ? 'strict' : 'shared-main-db',
    },
    tableCounts: db.tableCounts,
    databaseConnections: connections.records,
    checks,
    nextActions,
  };
}
