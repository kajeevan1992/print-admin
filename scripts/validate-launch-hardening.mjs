import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const requireText = (file, text, label) => {
  const content = read(file);
  if (!content.includes(text)) failures.push(`${label}: ${file} must contain ${JSON.stringify(text)}`);
};
const forbidText = (file, text, label) => {
  const content = read(file);
  if (content.includes(text)) failures.push(`${label}: ${file} must not contain ${JSON.stringify(text)}`);
};

const packageJson = JSON.parse(read('package.json'));
if (packageJson.engines?.node !== '>=22.13.0 <23') failures.push('Node runtime must be pinned to supported Node 22 LTS.');
for (const scriptName of ['build', 'start']) {
  const script = String(packageJson.scripts?.[scriptName] || '');
  if (!script.includes('prisma-migrate-with-db-env.cjs')) failures.push(`${scriptName} must run the tracked Prisma migration runner.`);
  if (!script.includes('bootstrap-admin-with-db-env.cjs')) failures.push(`${scriptName} must restore the configured bootstrap admin after migrations.`);
  if (script.includes('|| echo')) failures.push(`${scriptName} must not swallow Prisma or migration failures.`);
}

requireText('app/api/dev/seed/route.ts', 'requireSuperAdmin', 'Development seed authentication');
requireText('app/api/dev/seed/route.ts', 'ALLOW_PRODUCTION_DEV_SEED', 'Production seed kill switch');
requireText('app/api/dev/seed/route.ts', 'DEV_SEED_SECRET', 'Production seed secret');
requireText('middleware.ts', "process.env.NODE_ENV === 'production' ? []", 'Production CORS defaults');
forbidText('middleware.ts', 'sslip.io', 'Production CORS defaults');

const repairService = 'src/core/api/holo-storefront-repair.service.ts';
const repairRoute = 'app/api/internal/platform/holo-storefront-repair/route.ts';
requireText(repairRoute, 'requireSuperAdmin', 'HOLO storefront repair authentication');
requireText(repairRoute, 'REPAIR HOLO STOREFRONT', 'HOLO storefront repair confirmation');
requireText(repairService, "tenantSlug: 'holo-print-sidcup'", 'HOLO storefront repair tenant target');
requireText(repairService, "storeId: 'default-store'", 'HOLO storefront repair store target');
requireText(repairService, "liveTheme: 'base-atlantis'", 'HOLO storefront repair live theme');
requireText(repairService, 'createStore', 'HOLO storefront repair create boundary');
requireText(repairService, 'publishStore', 'HOLO storefront repair publish boundary');
forbidText(repairService, 'ensureProduct', 'HOLO storefront repair catalogue isolation');
forbidText(repairService, 'createOrRotateCredential', 'HOLO storefront repair credential isolation');
forbidText(repairService, 'holo-v2-native', 'HOLO storefront repair draft-theme isolation');

const runtimeAuthFiles = [
  'src/core/auth/admin-auth.service.ts',
  'src/core/auth/session-guard.service.ts',
  'src/core/security/security-audit.service.ts',
];
for (const file of runtimeAuthFiles) {
  forbidText(file, 'CREATE TABLE', 'Runtime auth schema ownership');
  forbidText(file, 'ALTER TABLE', 'Runtime auth schema ownership');
  forbidText(file, 'CREATE INDEX', 'Runtime auth schema ownership');
  forbidText(file, 'CREATE TYPE', 'Runtime auth schema ownership');
}
const authMigration = 'prisma/migrations/20260729171000_auth_platform_baseline/migration.sql';
const migrationRunner = 'scripts/prisma-migrate-with-db-env.cjs';
requireText('prisma/migrations/migration_lock.toml', 'provider = "postgresql"', 'Prisma migration provider lock');
requireText(authMigration, 'CREATE TABLE IF NOT EXISTS "User"', 'Tracked User schema');
requireText(authMigration, 'CREATE TABLE IF NOT EXISTS "AdminSession"', 'Tracked admin session schema');
requireText(authMigration, 'CREATE TABLE IF NOT EXISTS "AuditLog"', 'Tracked security audit schema');
requireText(migrationRunner, 'POSTGRES_URL_NON_POOLING', 'Direct migration database preference');
requireText(migrationRunner, "output.includes('P3005')", 'Existing production schema detection');
requireText(migrationRunner, "['db', 'execute'", 'Idempotent authentication baseline execution');
requireText(migrationRunner, 'historical migrations are not replayed', 'Legacy migration replay guard');
forbidText(migrationRunner, "['migrate', 'resolve', '--applied'", 'Unaudited migration history baseline');
forbidText(migrationRunner, 'Re-running Prisma migrate deploy after baselining.', 'Unaudited migration replay');
requireText('scripts/bootstrap-admin-with-db-env.cjs', 'BOOTSTRAP_ADMIN_EMAIL', 'Deployment admin bootstrap');
requireText('src/core/db/platform-prisma.ts', 'PRISMA_CONNECTION_LIMIT, 1)', 'Serverless Prisma connection cap');
requireText('app/api/internal/auth/admin-login/route.ts', "status: 503", 'Retryable login capacity response');
requireText('app/api/internal/auth/admin-login/route.ts', 'disconnectPlatformPrisma', 'Failed login connection release');

for (const key of [
  'DATABASE_URL',
  'NEXT_PUBLIC_APP_URL',
  'STOREFRONT_URL',
  'CORS_ORIGINS',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STOREFRONT_PAYMENT_TOKEN_SECRET',
  'CUSTOMER_MFA_ENCRYPTION_KEY',
  'SMTP_HOST',
  'SMTP_FROM',
  'ALLOW_PRODUCTION_DEV_SEED',
]) requireText('.env.example', key, 'Production environment example');

if (read('.nvmrc').trim() !== '22.13.1') failures.push('.nvmrc must pin Node 22.13.1.');

if (failures.length) {
  console.error('Launch hardening validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Launch hardening validation passed.');
