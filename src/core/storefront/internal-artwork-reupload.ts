import { randomUUID } from 'crypto';
import { mkdir, stat, writeFile } from 'fs/promises';
import path from 'path';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { queueInternalEmail, listInternalEmails, sendInternalEmail } from '@/core/email/internal-email.service';
import { extractPdfHints, listArtworkUploads, readArtworkUploadMetadata, writeArtworkUploadMetadata, type ArtworkReviewStatus, type StoredArtworkUpload } from './internal-artwork-storage';
import { resolveArtworkPreflight } from './internal-artwork-preflight';

type ReuploadEmailInput = {
  note?: string;
  customerEmail?: string;
  customerName?: string;
  storefrontBaseUrl?: string;
  adminBaseUrl?: string;
  orderNumber?: string;
  productName?: string;
};

type ReplacementFormResult = {
  upload: StoredArtworkUpload;
  previousFile?: unknown;
};

function uploadDir(id: string) {
  return path.join(process.cwd(), '.data', 'artwork-uploads', id.replace(/[^a-zA-Z0-9._-]+/g, '-'));
}

function safeName(value: string) {
  const name = value || 'replacement-artwork.pdf';
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'replacement-artwork.pdf';
}

function makeStorefrontLink(baseUrl: string | undefined, token: string, adminBaseUrl?: string) {
  const base = String(baseUrl || process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || '').replace(/\/$/, '');
  const adminBase = String(adminBaseUrl || process.env.NEXT_PUBLIC_ADMIN_URL || process.env.ADMIN_URL || '').replace(/\/$/, '');
  const params = new URLSearchParams({ token });
  if (adminBase) params.set('adminBase', adminBase);
  if (!base) return `/artwork-reupload/?${params.toString()}`;
  return `${base}/artwork-reupload/?${params.toString()}`;
}

function publicUpload(upload: StoredArtworkUpload) {
  const meta = upload as any;
  return {
    id: upload.id,
    orderId: upload.orderId,
    quoteId: upload.quoteId,
    productId: upload.productId,
    originalName: upload.originalName,
    reviewStatus: upload.reviewStatus,
    reviewNote: upload.reviewNote,
    preflight: upload.preflight,
    pageCount: upload.pageCount,
    widthMm: upload.widthMm,
    heightMm: upload.heightMm,
    reuploadRequestedAt: meta.reuploadRequestedAt,
    reuploadTokenExpiresAt: meta.reuploadTokenExpiresAt,
    replacementCount: Array.isArray(meta.replacementHistory) ? meta.replacementHistory.length : 0,
  };
}

export async function listEmailOutbox() {
  return listInternalEmails();
}

export async function requestArtworkReupload(uploadId: string, input: ReuploadEmailInput = {}) {
  const upload = await readArtworkUploadMetadata(uploadId) as any;
  const token = `aru_${randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const link = makeStorefrontLink(input.storefrontBaseUrl, token, input.adminBaseUrl);
  const subject = `New artwork required${input.orderNumber ? ` for order ${input.orderNumber}` : ''}`;
  const body = [
    `Hello${input.customerName ? ` ${input.customerName}` : ''},`,
    '',
    'We have checked your artwork and need a replacement file before production can continue.',
    input.note ? `Reason: ${input.note}` : '',
    '',
    `Please upload your corrected artwork here: ${link}`,
    '',
    'Recommended artwork: print-ready PDF, correct size, embedded fonts and 3mm bleed where required.',
    '',
    'Thank you.',
  ].filter((line) => line !== '').join('\n');

  const next = {
    ...upload,
    reviewStatus: 'replacement-requested' as ArtworkReviewStatus,
    reviewNote: input.note || upload.reviewNote || 'Replacement artwork requested.',
    replacementRequestedAt: now,
    reuploadToken: token,
    reuploadTokenExpiresAt: expiresAt,
    reuploadLink: link,
    reuploadRequestedAt: now,
    customerEmail: input.customerEmail || upload.customerEmail || '',
    customerName: input.customerName || upload.customerName || '',
    approvalHistory: [
      ...(upload.approvalHistory || []),
      { id: `review_${Date.now()}`, action: 'replacement-requested', actor: 'admin', note: input.note || 'Replacement requested and customer email queued.', createdAt: now },
    ],
  } as StoredArtworkUpload;

  await writeArtworkUploadMetadata(next);

  let email = await queueInternalEmail({
    type: 'artwork-reupload-request',
    to: input.customerEmail || '',
    subject,
    body,
    reuploadLink: link,
    uploadId,
    orderId: upload.orderId,
    quoteId: upload.quoteId,
  });
  if (process.env.ARTWORK_EMAIL_AUTO_SEND === 'true') {
    email = await sendInternalEmail(email.id);
  }

  return { upload: next, email, reuploadLink: link };
}

export async function findArtworkByReuploadToken(token: string) {
  const clean = String(token || '').trim();
  if (!clean) return null;
  const uploads = await listArtworkUploads();
  const upload = uploads.find((item) => (item as any).reuploadToken === clean) as any;
  if (!upload) return null;
  if (upload.reuploadTokenExpiresAt && new Date(upload.reuploadTokenExpiresAt).getTime() < Date.now()) return null;
  return upload as StoredArtworkUpload;
}

export async function getCustomerReuploadContext(token: string) {
  const upload = await findArtworkByReuploadToken(token);
  return upload ? publicUpload(upload) : null;
}

export async function saveReplacementArtwork(request: Request, token: string): Promise<ReplacementFormResult> {
  const upload = await findArtworkByReuploadToken(token) as any;
  if (!upload) throw new Error('This artwork re-upload link is invalid or expired.');
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('Replacement upload requires a file.');

  const dir = uploadDir(upload.id);
  await mkdir(dir, { recursive: true });
  const previousFile = {
    originalName: upload.originalName,
    storedName: upload.storedName,
    sizeBytes: upload.sizeBytes,
    mimeType: upload.mimeType,
    preflight: upload.preflight,
    uploadedAt: upload.createdAt,
  };
  const originalName = safeName(file.name || 'replacement-artwork.pdf');
  const storedName = `${upload.id}-replacement-${Date.now()}-${originalName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, storedName);
  await writeFile(filePath, buffer);
  await stat(filePath);

  const ctx = tenantContextFromRequest(request);
  const pdfHints = extractPdfHints(buffer);
  const fileMeta = { name: originalName, type: file.type, size: file.size, sizeBytes: file.size, ...pdfHints };
  const preflight = await resolveArtworkPreflight(ctx, { productId: upload.productId, files: [fileMeta], artworkMode: 'replacement' }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Preflight failed' }));
  const status = (preflight as any)?.preflight?.status === 'blocked' ? 'replacement-requested' : 'pending-review';
  const now = new Date().toISOString();
  const next = {
    ...upload,
    originalName,
    storedName,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    extension: originalName.includes('.') ? originalName.split('.').pop()?.toLowerCase() : '',
    pageCount: pdfHints.pageCount,
    widthMm: pdfHints.widthMm,
    heightMm: pdfHints.heightMm,
    pdfHints,
    preflight,
    reviewStatus: status,
    reviewNote: status === 'replacement-requested' ? 'Replacement uploaded but still has blocking preflight issues.' : 'Replacement uploaded by customer and awaiting review.',
    reuploadToken: undefined,
    reuploadTokenExpiresAt: undefined,
    reuploadLink: undefined,
    replacementReceivedAt: now,
    replacementHistory: [...(upload.replacementHistory || []), previousFile],
    approvalHistory: [
      ...(upload.approvalHistory || []),
      { id: `review_${Date.now()}`, action: status, actor: 'customer-reupload', note: status === 'replacement-requested' ? 'Replacement upload still blocked by preflight.' : 'Customer uploaded replacement artwork.', createdAt: now },
    ],
  } as StoredArtworkUpload;
  await writeArtworkUploadMetadata(next);
  return { upload: next, previousFile };
}
