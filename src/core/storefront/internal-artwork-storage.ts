import { randomUUID } from 'crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import path from 'path';
import type { TenantContext } from '@/core/tenant/types';
import { resolveArtworkPreflight } from './internal-artwork-preflight';

export type PdfPageAnalysis = {
  page: number;
  widthMm?: number;
  heightMm?: number;
  mediaBox?: number[];
  cropBox?: number[];
  trimBox?: number[];
  bleedBox?: number[];
  hasBleedBox: boolean;
  detectedBleedMm?: number;
  orientation?: 'portrait' | 'landscape' | 'square';
  blankLikely?: boolean;
};

export type PdfPreflightHints = {
  isPdf?: boolean;
  pageCount?: number;
  widthMm?: number;
  heightMm?: number;
  pages?: PdfPageAnalysis[];
  hasBleedBox?: boolean;
  detectedBleedMm?: number;
  mixedPageSizes?: boolean;
  encrypted?: boolean;
  hasRgb?: boolean;
  hasCmyk?: boolean;
  hasSpotColours?: boolean;
  hasTransparency?: boolean;
  hasImages?: boolean;
  hasEmbeddedFonts?: boolean;
  hasUnembeddedFonts?: boolean;
  fontNames?: string[];
  colourSpaces?: string[];
  pdfVersion?: string;
};

export type ArtworkReviewStatus = 'pending-review' | 'approved' | 'rejected' | 'replacement-requested';

export type ArtworkReviewEvent = {
  id: string;
  action: ArtworkReviewStatus;
  actor: string;
  note?: string;
  createdAt: string;
};

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
  pdfHints?: PdfPreflightHints;
  fileUrl: string;
  downloadUrl: string;
  preflight?: unknown;
  reviewStatus: ArtworkReviewStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  replacementRequestedAt?: string;
  approvalHistory: ArtworkReviewEvent[];
  createdAt: string;
};

function rootDir() {
  return path.join(process.cwd(), '.data', 'artwork-uploads');
}

function safeName(value: string) {
  const name = value || 'artwork.pdf';
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'artwork.pdf';
}

function uploadDir(id: string) {
  return path.join(rootDir(), safeName(id));
}

function metadataPath(id: string) {
  return path.join(uploadDir(id), 'metadata.json');
}

function extensionFromName(name: string) {
  return (name.includes('.') ? name.split('.').pop() : '')?.toLowerCase() || '';
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function ptToMm(value: number) {
  return Math.round(value * 0.3527777778 * 10) / 10;
}

function parseBox(text: string, name: 'MediaBox' | 'CropBox' | 'TrimBox' | 'BleedBox') {
  const regex = new RegExp(`/${name}\\s*\\[\\s*([-0-9.]+)\\s+([-0-9.]+)\\s+([-0-9.]+)\\s+([-0-9.]+)\\s*\\]`);
  const match = text.match(regex);
  if (!match) return undefined;
  const values = match.slice(1).map(Number);
  return values.every(Number.isFinite) ? values : undefined;
}

function boxWidthMm(box?: number[]) {
  return box ? ptToMm(Math.abs(box[2] - box[0])) : undefined;
}

function boxHeightMm(box?: number[]) {
  return box ? ptToMm(Math.abs(box[3] - box[1])) : undefined;
}

function bleedFromBoxes(trim?: number[], bleed?: number[], media?: number[]) {
  const outer = bleed || media;
  if (!trim || !outer) return undefined;
  const left = Math.abs(trim[0] - outer[0]);
  const bottom = Math.abs(trim[1] - outer[1]);
  const right = Math.abs(outer[2] - trim[2]);
  const top = Math.abs(outer[3] - trim[3]);
  const minPt = Math.min(left, bottom, right, top);
  return Math.round(ptToMm(minPt) * 10) / 10;
}

function pageObjectChunks(text: string) {
  const chunks: string[] = [];
  const regex = /(\d+\s+\d+\s+obj[\s\S]{0,12000}?\/Type\s*\/Page\b[\s\S]{0,12000}?endobj)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) && chunks.length < 2000) chunks.push(match[1]);
  return chunks;
}

function analysePages(text: string): PdfPageAnalysis[] {
  const chunks = pageObjectChunks(text);
  const fallbackBox = parseBox(text, 'MediaBox');
  const source = chunks.length ? chunks : [text];
  return source.map((chunk, index) => {
    const mediaBox = parseBox(chunk, 'MediaBox') || fallbackBox;
    const cropBox = parseBox(chunk, 'CropBox');
    const trimBox = parseBox(chunk, 'TrimBox');
    const bleedBox = parseBox(chunk, 'BleedBox');
    const widthMm = boxWidthMm(trimBox || cropBox || mediaBox);
    const heightMm = boxHeightMm(trimBox || cropBox || mediaBox);
    const detectedBleedMm = bleedFromBoxes(trimBox, bleedBox, mediaBox);
    return {
      page: index + 1,
      widthMm,
      heightMm,
      mediaBox,
      cropBox,
      trimBox,
      bleedBox,
      hasBleedBox: Boolean(bleedBox),
      detectedBleedMm,
      orientation: widthMm && heightMm ? widthMm > heightMm ? 'landscape' : widthMm < heightMm ? 'portrait' : 'square' : undefined,
      blankLikely: !/\/(Image|XObject|Font|Contents)\b/.test(chunk),
    };
  });
}

function countPdfPages(text: string, pages: PdfPageAnalysis[]) {
  if (pages.length && !(pages.length === 1 && pages[0].page === 1 && !pages[0].widthMm && !pages[0].heightMm)) return pages.length;
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches?.length || undefined;
}

function detectFonts(text: string) {
  const fontNames = unique([...text.matchAll(/\/(?:BaseFont|FontName)\s*\/([^\s\/>\[]+)/g)].map((match) => match[1].replace(/^\+/, ''))).slice(0, 100);
  const hasFontRefs = /\/Font\b|\/BaseFont\b|\/FontDescriptor\b/.test(text);
  const hasEmbeddedFonts = /\/FontFile\b|\/FontFile2\b|\/FontFile3\b/.test(text);
  return {
    fontNames,
    hasEmbeddedFonts: hasFontRefs ? hasEmbeddedFonts : undefined,
    hasUnembeddedFonts: hasFontRefs ? !hasEmbeddedFonts : undefined,
  };
}

function detectColourSpaces(text: string) {
  const colourSpaces: string[] = [];
  const hasRgb = /\/DeviceRGB\b|\/CalRGB\b|\/ICCBased\b/.test(text);
  const hasCmyk = /\/DeviceCMYK\b/.test(text);
  const hasGray = /\/DeviceGray\b|\/CalGray\b/.test(text);
  const hasSpotColours = /\/Separation\b|\/DeviceN\b/.test(text);
  if (hasCmyk) colourSpaces.push('CMYK');
  if (hasRgb) colourSpaces.push('RGB/ICC');
  if (hasGray) colourSpaces.push('Gray');
  if (hasSpotColours) colourSpaces.push('Spot/Separation');
  return { colourSpaces, hasRgb, hasCmyk, hasSpotColours };
}

function mixedPageSizes(pages: PdfPageAnalysis[]) {
  const sizes = unique(pages.map((page) => page.widthMm && page.heightMm ? `${Math.round(page.widthMm)}x${Math.round(page.heightMm)}` : ''));
  return sizes.length > 1;
}

export function extractPdfHints(buffer: Buffer): PdfPreflightHints {
  const text = buffer.toString('latin1', 0, Math.min(buffer.length, 1024 * 1024 * 20));
  if (!text.includes('%PDF')) return { isPdf: false };
  const pages = analysePages(text);
  const first = pages[0] || {};
  const fonts = detectFonts(text);
  const colours = detectColourSpaces(text);
  const version = text.match(/%PDF-([0-9.]+)/)?.[1];
  const detectedBleeds = pages.map((page) => page.detectedBleedMm).filter((value): value is number => typeof value === 'number');
  return {
    isPdf: true,
    pdfVersion: version,
    pageCount: countPdfPages(text, pages),
    widthMm: first.widthMm,
    heightMm: first.heightMm,
    pages,
    hasBleedBox: pages.some((page) => page.hasBleedBox),
    detectedBleedMm: detectedBleeds.length ? Math.min(...detectedBleeds) : undefined,
    mixedPageSizes: mixedPageSizes(pages),
    encrypted: /\/Encrypt\b/.test(text),
    hasImages: /\/Subtype\s*\/Image\b/.test(text),
    hasTransparency: /\/Transparency\b|\/ExtGState\b|\/ca\s+[0-9.]+|\/CA\s+[0-9.]+|\/SMask\b/.test(text),
    ...colours,
    ...fonts,
  };
}

function initialReviewStatus(preflight: unknown): ArtworkReviewStatus {
  const status = (preflight as any)?.preflight?.status;
  if (status === 'blocked') return 'replacement-requested';
  return 'pending-review';
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
  const fileMeta = { name: originalName, type: file.type, size: file.size, sizeBytes: file.size, ...pdfHints };
  const preflight = await resolveArtworkPreflight(ctx, { productId, files: [fileMeta], artworkMode: 'upload' }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Preflight failed' }));
  const reviewStatus = initialReviewStatus(preflight);
  const now = new Date().toISOString();

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
    pageCount: pdfHints.pageCount,
    widthMm: pdfHints.widthMm,
    heightMm: pdfHints.heightMm,
    pdfHints,
    fileUrl: `/api/internal/storefront/artwork/uploads/${id}/file`,
    downloadUrl: `/api/internal/storefront/artwork/uploads/${id}/file?download=1`,
    preflight,
    reviewStatus,
    reviewNote: reviewStatus === 'replacement-requested' ? 'Initial preflight found blocking issues. Replacement artwork is required.' : undefined,
    replacementRequestedAt: reviewStatus === 'replacement-requested' ? now : undefined,
    approvalHistory: [{ id: `review_${Date.now()}`, action: reviewStatus, actor: 'system-preflight', note: reviewStatus === 'replacement-requested' ? 'Blocking preflight result.' : 'Upload received and awaiting artwork approval.', createdAt: now }],
    createdAt: now,
  };
  await writeFile(metadataPath(id), JSON.stringify(meta, null, 2));
  return meta;
}

export async function listArtworkUploads() {
  await mkdir(rootDir(), { recursive: true });
  const entries = await readdir(rootDir()).catch(() => []);
  const uploads: StoredArtworkUpload[] = [];
  for (const entry of entries) {
    try {
      const meta = JSON.parse(await readFile(metadataPath(entry), 'utf8')) as StoredArtworkUpload;
      uploads.push({ reviewStatus: 'pending-review', approvalHistory: [], ...meta });
    } catch {}
  }
  return uploads.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function readArtworkUploadMetadata(id: string) {
  const meta = JSON.parse(await readFile(metadataPath(id), 'utf8')) as StoredArtworkUpload;
  return { reviewStatus: 'pending-review' as ArtworkReviewStatus, approvalHistory: [], ...meta };
}

export async function writeArtworkUploadMetadata(meta: StoredArtworkUpload) {
  await writeFile(metadataPath(meta.id), JSON.stringify(meta, null, 2));
  return meta;
}

export async function updateArtworkReview(id: string, input: { action: ArtworkReviewStatus; actor?: string; note?: string; orderId?: string; quoteId?: string }) {
  const meta = await readArtworkUploadMetadata(id);
  const now = new Date().toISOString();
  const next: StoredArtworkUpload = {
    ...meta,
    orderId: input.orderId || meta.orderId,
    quoteId: input.quoteId || meta.quoteId,
    reviewStatus: input.action,
    reviewNote: input.note || meta.reviewNote,
    reviewedBy: input.actor || 'admin',
    reviewedAt: input.action === 'approved' || input.action === 'rejected' ? now : meta.reviewedAt,
    replacementRequestedAt: input.action === 'replacement-requested' ? now : meta.replacementRequestedAt,
    approvalHistory: [
      ...(meta.approvalHistory || []),
      { id: `review_${Date.now()}`, action: input.action, actor: input.actor || 'admin', note: input.note, createdAt: now },
    ],
  };
  return writeArtworkUploadMetadata(next);
}

export async function readArtworkUploadFile(id: string) {
  const meta = await readArtworkUploadMetadata(id);
  const filePath = path.join(uploadDir(id), meta.storedName);
  await stat(filePath);
  const buffer = await readFile(filePath);
  return { meta, buffer };
}
