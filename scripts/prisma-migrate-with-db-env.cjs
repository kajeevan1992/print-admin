const { spawnSync } = require('node:child_process');

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

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

process.exit(result.status ?? 1);
