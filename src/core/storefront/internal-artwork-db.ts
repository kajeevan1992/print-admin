import { mkdir, readFile, readdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import type { TenantContext } from '@/core/tenant/types';
import type { ArtworkReviewStatus, StoredArtworkUpload } from './internal-artwork-storage';

function rootDir() { return path.join(process.cwd(), '.data', 'artwork-uploads'); }
function metadataPath(id: string) { return path.join(rootDir(), id.replace(/[^a-zA-Z0-9._-]+/g, '-'), 'metadata.json'); }
function dateOut(value: unknown) { return value ? new Date(String(value)).toISOString() : undefined; }

async function resolveTenantId(ctx?: Pick<TenantContext, 'tenantId'>) {
  const value = String(ctx?.tenantId || process.env.DEFAULT_TENANT_ID || 'platform-demo').trim();
  const tenant =
    (value && await prisma.tenant.findUnique({ where: { id: value }, select: { id: true } }).catch(() => null)) ||
    (value && await prisma.tenant.findUnique({ where: { slug: value }, select: { id: true } }).catch(() => null)) ||
    (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }).catch(() => null));
  return tenant?.id || null;
}

function dbReady() { return Boolean((prisma as any).artwork); }

function toDbStatus(status: ArtworkReviewStatus) {
  if (status === 'approved') return 'APPROVED';
  if (status === 'rejected' || status === 'replacement-requested') return 'CHANGES_REQUESTED';
  return 'CHECKING';
}

function rowToUpload(row: any): StoredArtworkUpload {
  const meta = (row.metadataJson || {}) as StoredArtworkUpload & Record<string, any>;
  return {
    reviewStatus: 'pending-review',
    approvalHistory: [],
    ...meta,
    id: row.id,
    tenantId: row.tenantId,
    orderId: row.orderId || meta.orderId,
    productId: row.productId || meta.productId,
    originalName: meta.originalName || row.fileName,
    mimeType: meta.mimeType || row.fileType,
    sizeBytes: meta.sizeBytes || row.fileSizeBytes || 0,
    storedName: meta.storedName || row.storageKey || row.fileName,
    fileUrl: meta.fileUrl || `/api/internal/storefront/artwork/uploads/${row.id}/file`,
    downloadUrl: meta.downloadUrl || `/api/internal/storefront/artwork/uploads/${row.id}/file?download=1`,
    createdAt: meta.createdAt || dateOut(row.createdAt) || new Date().toISOString(),
    storageSource: 'db',
    migratedFromFile: Boolean(meta.migratedFromFile),
  } as StoredArtworkUpload;
}

async function readFileUploads() {
  await mkdir(rootDir(), { recursive: true });
  const entries = await readdir(rootDir()).catch(() => []);
  const uploads: StoredArtworkUpload[] = [];
  for (const entry of entries) {
    try {
      const meta = JSON.parse(await readFile(metadataPath(entry), 'utf8')) as StoredArtworkUpload;
      uploads.push({ reviewStatus: 'pending-review', approvalHistory: [], ...meta } as StoredArtworkUpload);
    } catch {}
  }
  return uploads;
}

async function upsertDbUpload(tenantId: string, meta: StoredArtworkUpload, migratedFromFile = false) {
  const data = {
    tenantId,
    orderId: meta.orderId || null,
    productId: meta.productId || null,
    fileName: meta.originalName || meta.storedName || 'artwork.pdf',
    fileType: meta.mimeType || 'application/octet-stream',
    fileSizeBytes: meta.sizeBytes || 0,
    storageKey: meta.storedName || null,
    status: toDbStatus(meta.reviewStatus || 'pending-review') as any,
    note: meta.reviewNote || null,
    metadataJson: { ...meta, storageSource: 'db', migratedFromFile } as any,
  };
  const row = await (prisma as any).artwork.upsert({ where: { id: meta.id }, update: data, create: { id: meta.id, ...data } });
  return rowToUpload(row);
}

export async function migrateFileArtworkToDb(ctx?: Pick<TenantContext, 'tenantId'>) {
  const tenantId = await resolveTenantId(ctx);
  if (!tenantId || !dbReady()) return 0;
  const items = await readFileUploads();
  let count = 0;
  for (const item of items) {
    await upsertDbUpload(tenantId, item, true).catch(() => null);
    count += 1;
  }
  return count;
}

export async function saveArtworkMetadataDb(meta: StoredArtworkUpload, ctx?: Pick<TenantContext, 'tenantId'>) {
  const tenantId = await resolveTenantId(ctx);
  if (!tenantId || !dbReady()) return null;
  return upsertDbUpload(tenantId, { ...meta, tenantId }, false).catch(() => null);
}

export async function listArtworkMetadataDb(ctx?: Pick<TenantContext, 'tenantId'>) {
  const tenantId = await resolveTenantId(ctx);
  if (!tenantId || !dbReady()) return null;
  await migrateFileArtworkToDb({ tenantId }).catch(() => 0);
  const rows = await (prisma as any).artwork.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }).catch(() => null);
  return Array.isArray(rows) ? rows.map(rowToUpload) : null;
}

export async function readArtworkMetadataDb(id: string, ctx?: Pick<TenantContext, 'tenantId'>) {
  const tenantId = await resolveTenantId(ctx);
  if (!tenantId || !dbReady()) return null;
  await migrateFileArtworkToDb({ tenantId }).catch(() => 0);
  const row = await (prisma as any).artwork.findFirst({ where: { tenantId, id } }).catch(() => null);
  return row ? rowToUpload(row) : null;
}

export async function artworkStorageStatus(ctx?: Pick<TenantContext, 'tenantId'>) {
  const tenantId = await resolveTenantId(ctx);
  if (!tenantId || !dbReady()) return { mode: 'file-fallback', tenantId, dbReady: false, migratedFileArtwork: 0 };
  return { mode: 'db-primary', tenantId, dbReady: true, migratedFileArtwork: await migrateFileArtworkToDb({ tenantId }).catch(() => 0) };
}
