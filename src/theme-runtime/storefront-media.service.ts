import crypto from 'crypto';
import { platformPrisma } from '@/core/db/platform-prisma';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_STORE_BYTES = 100 * 1024 * 1024;
const MAX_ASSETS = 80;

export const STOREFRONT_MEDIA_LIMITS = {
  maxFileBytes: MAX_FILE_BYTES,
  maxStoreBytes: MAX_STORE_BYTES,
  maxAssets: MAX_ASSETS,
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
};

type TenantScope = {
  canonicalTenantId: string;
  tenantSlug: string;
  tenantIds: string[];
};

type StoreRow = {
  id: string;
  tenantId: string;
  storeSlug: string;
};

type MediaRow = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  storeSlug: string;
  filename: string;
  label: string;
  altText: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type MediaContentRow = MediaRow & { content: Buffer };

export type StorefrontMediaAsset = {
  id: string;
  storeSlug: string;
  filename: string;
  label: string;
  altText: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function slug(value: unknown) {
  return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function iso(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function safeFilename(value: unknown, mimeType: string) {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1] || 'image';
  const base = clean(value)
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `storefront-image.${extension}`;
  return base.slice(0, 160);
}

function publicUrl(tenantSlug: string, storeSlug: string, assetId: string) {
  return `/api/native-storefront/media/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(storeSlug)}/${encodeURIComponent(assetId)}`;
}

function serialise(row: MediaRow): StorefrontMediaAsset {
  return {
    id: row.id,
    storeSlug: row.storeSlug,
    filename: row.filename,
    label: row.label,
    altText: row.altText,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes || 0),
    checksum: row.checksum,
    url: publicUrl(row.tenantSlug, row.storeSlug, row.id),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

async function ensureMediaTable() {
  await platformPrisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StorefrontMediaAsset" (
      "id" TEXT PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "tenantSlug" TEXT NOT NULL,
      "storeSlug" TEXT NOT NULL,
      "filename" TEXT NOT NULL,
      "label" TEXT NOT NULL DEFAULT '',
      "altText" TEXT NOT NULL DEFAULT '',
      "mimeType" TEXT NOT NULL,
      "sizeBytes" INTEGER NOT NULL,
      "checksum" TEXT NOT NULL,
      "content" BYTEA NOT NULL,
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontMediaAsset_tenant_store_idx" ON "StorefrontMediaAsset"("tenantId","storeSlug","createdAt")');
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontMediaAsset_tenant_store_checksum_key" ON "StorefrontMediaAsset"("tenantId","storeSlug","checksum")');
}

async function resolveTenantScope(tenantSlugOrId: string): Promise<TenantScope> {
  const requested = clean(tenantSlugOrId);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; defaultSubdomain: string }>>(
    'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
    requested,
  ).catch(() => []);
  const tenant = rows[0];
  return {
    canonicalTenantId: tenant?.id || requested,
    tenantSlug: tenant?.slug || requested,
    tenantIds: uniq([requested, tenant?.id || '', tenant?.slug || '', tenant?.defaultSubdomain || '']),
  };
}

async function resolveStore(scope: TenantScope, requestedStoreSlug: string): Promise<StoreRow> {
  const storeSlug = slug(requestedStoreSlug);
  if (!storeSlug) throw new Error('Choose a storefront before managing media.');
  const placeholders = scope.tenantIds.map((_, index) => `$${index + 1}`).join(',');
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; tenantId: string; slug: string; metadataJson: Record<string, unknown> | null }>>(
    `SELECT id,"tenantId",slug,"metadataJson"
     FROM "CoreCatalogRecord"
     WHERE resource='storefront-stores'
       AND "tenantId" IN (${placeholders})
       AND (
         slug=$${scope.tenantIds.length + 1}
         OR "metadataJson"->>'storeId'=$${scope.tenantIds.length + 1}
         OR "metadataJson"->>'slug'=$${scope.tenantIds.length + 1}
         OR "metadataJson"->>'storeSlug'=$${scope.tenantIds.length + 1}
       )
     ORDER BY "updatedAt" DESC
     LIMIT 1`,
    ...scope.tenantIds,
    storeSlug,
  ).catch(() => []);
  const row = rows[0];
  if (!row) throw new Error('Storefront store not found for this tenant.');
  return { id: row.id, tenantId: row.tenantId, storeSlug };
}

function detectedMimeType(buffer: Buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  const firstSix = buffer.subarray(0, 6).toString('ascii');
  if (firstSix === 'GIF87a' || firstSix === 'GIF89a') return 'image/gif';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp' && ['avif', 'avis'].includes(buffer.subarray(8, 12).toString('ascii'))) return 'image/avif';
  return '';
}

function cleanLabel(value: unknown, maximum = 120) {
  return clean(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').slice(0, maximum);
}

async function storageUsage(tenantId: string, storeSlug: string) {
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ count: number | string; total: number | string }>>(
    'SELECT COUNT(*)::int AS count, COALESCE(SUM("sizeBytes"),0)::bigint AS total FROM "StorefrontMediaAsset" WHERE "tenantId"=$1 AND "storeSlug"=$2',
    tenantId,
    storeSlug,
  );
  return { count: Number(rows[0]?.count || 0), total: Number(rows[0]?.total || 0) };
}

export async function listStorefrontMediaAssets(tenantSlugOrId: string, requestedStoreSlug: string) {
  await ensureMediaTable();
  const scope = await resolveTenantScope(tenantSlugOrId);
  const store = await resolveStore(scope, requestedStoreSlug);
  const [rows, usage] = await Promise.all([
    platformPrisma.$queryRawUnsafe<MediaRow[]>(
      `SELECT id,"tenantId","tenantSlug","storeSlug",filename,label,"altText","mimeType","sizeBytes",checksum,"createdAt","updatedAt"
       FROM "StorefrontMediaAsset"
       WHERE "tenantId"=$1 AND "storeSlug"=$2
       ORDER BY "createdAt" DESC`,
      store.tenantId,
      store.storeSlug,
    ),
    storageUsage(store.tenantId, store.storeSlug),
  ]);
  return { storeSlug: store.storeSlug, assets: rows.map(serialise), usage, limits: STOREFRONT_MEDIA_LIMITS };
}

export async function createStorefrontMediaAsset(
  tenantSlugOrId: string,
  requestedStoreSlug: string,
  input: { filename: string; bytes: Buffer; label?: string; altText?: string; createdBy?: string },
) {
  await ensureMediaTable();
  const scope = await resolveTenantScope(tenantSlugOrId);
  const store = await resolveStore(scope, requestedStoreSlug);
  if (!input.bytes.length) throw new Error('Choose an image to upload.');
  if (input.bytes.length > MAX_FILE_BYTES) throw new Error(`Storefront images must be ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB or smaller.`);
  const mimeType = detectedMimeType(input.bytes);
  if (!mimeType) throw new Error('Upload a JPEG, PNG, WebP, GIF or AVIF image. SVG and other active file formats are not allowed.');
  const checksum = crypto.createHash('sha256').update(input.bytes).digest('hex');
  const label = cleanLabel(input.label || input.filename);
  const altText = cleanLabel(input.altText, 240);
  const filename = safeFilename(input.filename, mimeType);

  const duplicates = await platformPrisma.$queryRawUnsafe<MediaRow[]>(
    `SELECT id,"tenantId","tenantSlug","storeSlug",filename,label,"altText","mimeType","sizeBytes",checksum,"createdAt","updatedAt"
     FROM "StorefrontMediaAsset"
     WHERE "tenantId"=$1 AND "storeSlug"=$2 AND checksum=$3
     LIMIT 1`,
    store.tenantId,
    store.storeSlug,
    checksum,
  );
  if (duplicates[0]) {
    const rows = await platformPrisma.$queryRawUnsafe<MediaRow[]>(
      `UPDATE "StorefrontMediaAsset"
       SET label=$1,"altText"=$2,"updatedAt"=NOW()
       WHERE id=$3 AND "tenantId"=$4 AND "storeSlug"=$5
       RETURNING id,"tenantId","tenantSlug","storeSlug",filename,label,"altText","mimeType","sizeBytes",checksum,"createdAt","updatedAt"`,
      label,
      altText,
      duplicates[0].id,
      store.tenantId,
      store.storeSlug,
    );
    return serialise(rows[0] || duplicates[0]);
  }

  const usage = await storageUsage(store.tenantId, store.storeSlug);
  if (usage.count >= MAX_ASSETS) throw new Error(`This storefront already has the maximum of ${MAX_ASSETS} media assets.`);
  if (usage.total + input.bytes.length > MAX_STORE_BYTES) throw new Error(`This storefront has reached its ${Math.round(MAX_STORE_BYTES / 1024 / 1024)} MB media allowance.`);

  const id = `sfmedia-${crypto.randomUUID()}`;
  const rows = await platformPrisma.$queryRawUnsafe<MediaRow[]>(
    `INSERT INTO "StorefrontMediaAsset"
      (id,"tenantId","tenantSlug","storeSlug",filename,label,"altText","mimeType","sizeBytes",checksum,content,"createdBy","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
     RETURNING id,"tenantId","tenantSlug","storeSlug",filename,label,"altText","mimeType","sizeBytes",checksum,"createdAt","updatedAt"`,
    id,
    store.tenantId,
    scope.tenantSlug,
    store.storeSlug,
    filename,
    label,
    altText,
    mimeType,
    input.bytes.length,
    checksum,
    input.bytes,
    clean(input.createdBy),
  );
  return serialise(rows[0]);
}

export async function updateStorefrontMediaAsset(
  tenantSlugOrId: string,
  requestedStoreSlug: string,
  assetId: string,
  input: { label?: string; altText?: string },
) {
  await ensureMediaTable();
  const scope = await resolveTenantScope(tenantSlugOrId);
  const store = await resolveStore(scope, requestedStoreSlug);
  const rows = await platformPrisma.$queryRawUnsafe<MediaRow[]>(
    `UPDATE "StorefrontMediaAsset"
     SET label=$1,"altText"=$2,"updatedAt"=NOW()
     WHERE id=$3 AND "tenantId"=$4 AND "storeSlug"=$5
     RETURNING id,"tenantId","tenantSlug","storeSlug",filename,label,"altText","mimeType","sizeBytes",checksum,"createdAt","updatedAt"`,
    cleanLabel(input.label),
    cleanLabel(input.altText, 240),
    clean(assetId),
    store.tenantId,
    store.storeSlug,
  );
  if (!rows[0]) throw new Error('Storefront media asset not found.');
  return serialise(rows[0]);
}

async function assetIsReferenced(store: StoreRow, url: string) {
  const pattern = `%${url}%`;
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ used: boolean }>>(
    `SELECT EXISTS (
       SELECT 1 FROM "CoreCatalogRecord"
       WHERE "tenantId"=$1
         AND (
           (resource='hosted-theme-settings' AND slug=$2)
           OR (resource='storefront-stores' AND id=$3)
         )
         AND COALESCE("metadataJson"::text,'') LIKE $4
     ) AS used`,
    store.tenantId,
    store.storeSlug,
    store.id,
    pattern,
  );
  return Boolean(rows[0]?.used);
}

export async function deleteStorefrontMediaAsset(tenantSlugOrId: string, requestedStoreSlug: string, assetId: string) {
  await ensureMediaTable();
  const scope = await resolveTenantScope(tenantSlugOrId);
  const store = await resolveStore(scope, requestedStoreSlug);
  const rows = await platformPrisma.$queryRawUnsafe<MediaRow[]>(
    `SELECT id,"tenantId","tenantSlug","storeSlug",filename,label,"altText","mimeType","sizeBytes",checksum,"createdAt","updatedAt"
     FROM "StorefrontMediaAsset"
     WHERE id=$1 AND "tenantId"=$2 AND "storeSlug"=$3
     LIMIT 1`,
    clean(assetId),
    store.tenantId,
    store.storeSlug,
  );
  const row = rows[0];
  if (!row) throw new Error('Storefront media asset not found.');
  const url = publicUrl(row.tenantSlug, row.storeSlug, row.id);
  if (await assetIsReferenced(store, url)) throw new Error('This image is still used by the storefront. Remove it from the draft and published storefront before deleting it.');
  await platformPrisma.$executeRawUnsafe('DELETE FROM "StorefrontMediaAsset" WHERE id=$1 AND "tenantId"=$2 AND "storeSlug"=$3', row.id, store.tenantId, store.storeSlug);
  return { id: row.id };
}

export async function readStorefrontMediaAsset(tenantSlugOrId: string, requestedStoreSlug: string, assetId: string) {
  await ensureMediaTable();
  const scope = await resolveTenantScope(tenantSlugOrId);
  const store = await resolveStore(scope, requestedStoreSlug);
  const rows = await platformPrisma.$queryRawUnsafe<MediaContentRow[]>(
    `SELECT id,"tenantId","tenantSlug","storeSlug",filename,label,"altText","mimeType","sizeBytes",checksum,content,"createdAt","updatedAt"
     FROM "StorefrontMediaAsset"
     WHERE id=$1 AND "tenantId"=$2 AND "storeSlug"=$3
     LIMIT 1`,
    clean(assetId),
    store.tenantId,
    store.storeSlug,
  );
  return rows[0] || null;
}
