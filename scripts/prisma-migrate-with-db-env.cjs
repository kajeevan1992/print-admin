const { spawnSync } = require('node:child_process');
const path = require('node:path');

const BASELINE_MIGRATION = '20260729171000_auth_platform_baseline';
const BASELINE_SQL = path.join('prisma', 'migrations', BASELINE_MIGRATION, 'migration.sql');
const DB_KEYS = [
  'DATABASE_DIRECT_URL',
  'DIRECT_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'PRISMA_DATABASE_URL',
  'DATABASE_POOL_URL',
  'POSTGRES_PRISMA_URL',
  'AIVEN_DATABASE_URL',
  'DATABASE_URL',
  'POSTGRES_URL',
];

function clean(value) {
  let text = String(value || '').trim();
  const pgLong = text.indexOf('postgresql://');
  const pgShort = text.indexOf('postgres://');
  const start = pgLong >= 0 ? pgLong : pgShort >= 0 ? pgShort : -1;
  if (start > 0) text = text.slice(start);
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) text = text.slice(1, -1).trim();
  return text;
}

function isPostgresUrl(value) {
  return /^postgres(ql)?:\/\//i.test(clean(value));
}

function isDisconnectedCiPlaceholder(value) {
  if (String(process.env.GITHUB_ACTIONS || '').toLowerCase() !== 'true') return false;
  try {
    const url = new URL(clean(value));
    return ['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.replace(/^\//, '') === 'build';
  } catch {
    return false;
  }
}

function runPrisma(args, capture = false) {
  const result = spawnSync('npx', ['prisma', ...args], {
    stdio: capture ? 'pipe' : 'inherit',
    encoding: capture ? 'utf8' : undefined,
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  return result;
}

const selectedKey = DB_KEYS.find((key) => isPostgresUrl(process.env[key]));
if (!selectedKey) {
  console.log('No PostgreSQL URL is available; skipping Prisma migrate deploy for this build.');
  process.exit(0);
}

if (isDisconnectedCiPlaceholder(process.env[selectedKey])) {
  console.log('Skipping Prisma migrate deploy for the disconnected GitHub Actions database placeholder.');
  process.exit(0);
}

process.env.DATABASE_URL = clean(process.env[selectedKey]);
console.log(`Prisma migrate deploy using ${selectedKey}.`);

let result = runPrisma(['migrate', 'deploy'], true);
if ((result.status ?? 1) === 0) process.exit(0);

const output = `${result.stdout || ''}\n${result.stderr || ''}`;
if (!output.includes('P3005')) process.exit(result.status ?? 1);

console.log('Existing non-empty schema detected without Prisma history; applying the idempotent auth baseline once.');
result = runPrisma(['db', 'execute', '--file', BASELINE_SQL, '--schema', 'prisma/schema.prisma']);
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);

console.log(`Recording ${BASELINE_MIGRATION} as applied.`);
result = runPrisma(['migrate', 'resolve', '--applied', BASELINE_MIGRATION, '--schema', 'prisma/schema.prisma']);
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);

console.log('Re-running Prisma migrate deploy after baselining.');
result = runPrisma(['migrate', 'deploy']);
process.exit(result.status ?? 1);
