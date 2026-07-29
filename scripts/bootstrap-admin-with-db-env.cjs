const crypto = require('node:crypto');

const DB_KEYS = [
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_DIRECT_URL',
  'DIRECT_DATABASE_URL',
  'AIVEN_DATABASE_URL',
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'PRISMA_DATABASE_URL',
  'DATABASE_POOL_URL',
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

function env(name) {
  return String(process.env[name] || '').trim();
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'holo-print-sidcup';
}

function passwordHash(secret, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(secret, salt, 180000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$180000$${salt}$${hash}`;
}

async function main() {
  const email = env('BOOTSTRAP_ADMIN_EMAIL').toLowerCase();
  const secret = env('BOOTSTRAP_ADMIN_PASSWORD');
  if (!email || !secret) {
    console.log('Bootstrap admin credentials are not configured; skipping deployment-time admin bootstrap.');
    return;
  }

  const selectedKey = DB_KEYS.find((key) => isPostgresUrl(process.env[key]));
  if (!selectedKey) {
    console.log('No PostgreSQL URL is available; skipping deployment-time admin bootstrap.');
    return;
  }

  const rawUrl = clean(process.env[selectedKey]);
  const url = new URL(rawUrl);
  if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '1');
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '20');
  process.env.DATABASE_URL = url.toString();

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } }, log: ['error'] });

  try {
    const existing = await prisma.$queryRawUnsafe(
      'SELECT id, "passwordHash" FROM "User" WHERE lower(email)=lower($1) LIMIT 1',
      email,
    );
    if (existing[0]?.passwordHash) {
      console.log('Configured bootstrap admin already has a password; leaving the account unchanged.');
      return;
    }

    const tenantSlug = slug(env('DEFAULT_TENANT_ID') || 'holo-print-sidcup');
    const tenantId = `tenant-${tenantSlug}`;
    const tenantName = env('BOOTSTRAP_TENANT_NAME') || 'HOLO Print';

    await prisma.$executeRawUnsafe(
      'INSERT INTO "Tenant" (id, name, slug, "defaultSubdomain", status, "updatedAt") VALUES ($1,$2,$3,$4,\'ACTIVE\',NOW()) ON CONFLICT (slug) DO NOTHING',
      tenantId,
      tenantName,
      tenantSlug,
      tenantSlug,
    );
    const tenants = await prisma.$queryRawUnsafe(
      'SELECT id FROM "Tenant" WHERE slug=$1 LIMIT 1',
      tenantSlug,
    );
    const resolvedTenantId = tenants[0]?.id || tenantId;
    const hash = passwordHash(secret);
    const name = env('BOOTSTRAP_ADMIN_NAME') || 'Admin User';

    if (existing[0]?.id) {
      await prisma.$executeRawUnsafe(
        'UPDATE "User" SET "tenantId"=$1, name=$2, role=$3::"UserRole", "passwordHash"=$4, "isActive"=true, "sessionVersion"=1, "updatedAt"=NOW() WHERE id=$5',
        resolvedTenantId,
        name,
        'SUPERADMIN',
        hash,
        existing[0].id,
      );
      console.log('Configured bootstrap admin password was restored.');
      return;
    }

    await prisma.$executeRawUnsafe(
      'INSERT INTO "User" (id, "tenantId", email, name, role, "passwordHash", "isActive", "sessionVersion", "updatedAt") VALUES ($1,$2,$3,$4,$5::"UserRole",$6,true,1,NOW())',
      `user-${crypto.randomUUID()}`,
      resolvedTenantId,
      email,
      name,
      'SUPERADMIN',
      hash,
    );
    console.log('Configured bootstrap admin was created for the migrated auth schema.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Deployment-time admin bootstrap failed.');
  console.error(error);
  process.exit(1);
});
