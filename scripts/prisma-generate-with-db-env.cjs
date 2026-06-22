const { spawnSync } = require('node:child_process');

const DB_KEYS = [
  'AIVEN_DATABASE_URL',
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
];

function isPostgresUrl(value) {
  return /^postgres(ql)?:\/\//i.test(String(value || '').trim());
}

const selectedKey = DB_KEYS.find((key) => isPostgresUrl(process.env[key]));

if (selectedKey) {
  process.env.DATABASE_URL = String(process.env[selectedKey]).trim();
  console.log(`Prisma generate using ${selectedKey}.`);
} else {
  console.warn('No valid Postgres database URL found for Prisma generate. DATABASE_URL must start with postgres:// or postgresql://.');
}

const result = spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
