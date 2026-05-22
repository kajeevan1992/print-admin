import { randomUUID } from 'crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import path from 'path';
import type { TenantContext } from '@/core/tenant/types';
import { resolveArtworkPreflight } from './internal-artwork-preflight';

export type StoredArtworkUpload = {
  id: string;
  tenantId: string;
  siteId?: string;
  productId?: string;
  orderId?: string;
  quoteId?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  extension: string;
  pageCount?: number;
  widthMm?: number;
  heightMm?: number;
  fileUrl: string;
  downloadUrl: string;
  preflight?: unknown;
  createdAt: string;
};

function rootDir() {
  return path.join(process.cwd(), '.data', 'artwork-uploads');
}

function safeName(value: string) {
  const name = value || 'artwork.pdf';
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'artwork.pdf';
}

function extensionFromName(name: string) {
  return (name.includes('.') ? name.split('.').pop() : '')?.toLowerCase() || '';
}

function countPdfPages(text: string) {
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches?.length || undefined;
}

function firstMediaBoxMm(text: string) {
  const match = text.match(/\/MediaBox\s*\[\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)\s*\]/);
  if (!match) return {};
  const widthPt = Number(match[1]);
  const heightPt = Number(match[2]);
  if (!Number.isFinite(widthPt) || !Number.isFinite(heightPt)) return {};
  const mm = 0.3527777778;
  return { widthMm: Math.round(widthPt * mm * 10) / 10, heightMm: Math.round(heightPt * mm * 10) / 10 };
}

export function extractPdfHints(buffer: Buffer) {
  const headAndBody = buffer.toString('latin1', 0, Math.min(buffer.length, 1024 * 1024 * 8));
  if (!headAndBody.includes('%PDF')) return {};
  return {
    pageCount: countPdfPages(headAndBody),
    ...firstMediaBoxMm(headAndBody),
  };
}

export async function saveArtworkUpload(ctx: TenantContext, formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('Artwork upload requires a file field.');

  const productId = String(formData.get('productId') || formData.get('slug') || '').trim();
  const orderId = String(formData.get('orderId') || '').trim() || undefined;
  const quoteId = String(formData.get('quoteId') || '').trim() || undefined;
  const id = `art_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const originalName = safeName(file.name || 'artwork.pdf');
  const extension = extensionFromName(originalName);
  const storedName = `${id}-${originalName}`;
  const dir = path.join(rootDir(), id);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, storedName);
  await writeFile(filePath, buffer);

  const pdfHints = extractPdfHints(buffer);
  const fileMeta = {
    name: originalName,
    type: file.type,
    size: file.size,
    sizeBytes: file.size,
    ...pdfHints,
  };
  const preflight = await resolveArtworkPreflight(ctx, { productId, files: [fileMeta], artworkMode: 'upload' }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Preflight failed' }));

  const meta: StoredArtworkUpload = {
    id,
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    productId: productId || undefined,
    orderId,
    quoteId,
    originalName,
    storedName,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    extension,
    ...pdfHints,
    fileUrl: `/api/internal/storefront/artwork/uploads/${id}/file`,
    downloadUrl: `/api/internal/storefront/artwork/uploads/${id}/file?download=1`,
    preflight,
    createdAt: new Date().toISOString(),
  };
  await writeFile(path.join(dir, 'metadata.json'), JSON.stringify(meta, null, 2));
  return meta;
}

export async function listArtworkUploads() {
  await mkdir(rootDir(), { recursive: true });
  const entries = await readdir(rootDir()).catch(() => []);
  const uploads: StoredArtworkUpload[] = [];
  for (const entry of entries) {
    try {
      const meta = JSON.parse(await readFile(path.join(rootDir(), entry, 'metadata.json'), 'utf8')) as StoredArtworkUpload;
      uploads.push(meta);
    } catch {}
  }
  return uploads.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function readArtworkUploadFile(id: string) {
  const safeId = safeName(id);
  const dir = path.join(rootDir(), safeId);
  const meta = JSON.parse(await readFile(path.join(dir, 'metadata.json'), 'utf8')) as StoredArtworkUpload;
  const filePath = path.join(dir, meta.storedName);
  await stat(filePath);
  const buffer = await readFile(filePath);
  return { meta, buffer };
}
