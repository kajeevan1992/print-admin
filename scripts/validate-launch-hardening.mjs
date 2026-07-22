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
if (!String(packageJson.scripts?.start || '').includes('prisma migrate deploy &&')) failures.push('Production start must stop when prisma migrate deploy fails.');
if (String(packageJson.scripts?.start || '').includes('|| echo')) failures.push('Production start must not swallow Prisma or migration failures.');

requireText('app/api/dev/seed/route.ts', 'requireSuperAdmin', 'Development seed authentication');
requireText('app/api/dev/seed/route.ts', 'ALLOW_PRODUCTION_DEV_SEED', 'Production seed kill switch');
requireText('app/api/dev/seed/route.ts', 'DEV_SEED_SECRET', 'Production seed secret');
requireText('middleware.ts', "process.env.NODE_ENV === 'production' ? []", 'Production CORS defaults');
forbidText('middleware.ts', 'sslip.io', 'Production CORS defaults');

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
