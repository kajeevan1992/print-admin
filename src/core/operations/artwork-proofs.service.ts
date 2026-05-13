import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

type ProofInput = Record<string, any>;

async function tenantIdFromRequest(request: Request) {
  const context = tenantContextFromRequest(request);
  const value = String(context.tenantId || '').trim();
  const tenant =
    (value && (await prisma.tenant.findUnique({ where: { id: value }, select: { id: true } }))) ||
    (value && (await prisma.tenant.findUnique({ where: { slug: value }, select: { id: true } }))) ||
    (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }));

  if (!tenant) throw new Error('No tenant found for artwork proof persistence.');
  return tenant.id;
}

function statusFrom(input: ProofInput) {
  const raw = String(input.status || 'UPLOADED').toUpperCase().replace(/-/g, '_');
  return ['UPLOADED', 'CHECKING', 'APPROVED', 'CHANGES_REQUESTED'].includes(raw) ? raw : 'UPLOADED';
}

function normalize(artwork: any) {
  return {
    id: artwork.id,
    tenantId: artwork.tenantId,
    orderId: artwork.orderId || null,
    productId: artwork.productId || null,
    fileName: artwork.fileName,
    fileType: artwork.fileType,
    fileSizeBytes: artwork.fileSizeBytes || 0,
    storageKey: artwork.storageKey || '',
    status: artwork.status,
    note: artwork.note || '',
    versions: artwork.versions || [],
    createdAt: artwork.createdAt,
    updatedAt: artwork.updatedAt,
    source: 'internal-artwork-proofs-db',
  };
}

export async function saveArtworkProof(request: Request, input: ProofInput) {
  const tenantId = await tenantIdFromRequest(request);
  const id = String(input.id || input.artworkId || '').trim();
  const fileName = String(input.fileName || input.name || 'artwork-proof.pdf');
  const data = {
    tenantId,
    orderId: input.orderId || null,
    productId: input.productId || null,
    fileName,
    fileType: String(input.fileType || input.mimeType || 'application/pdf'),
    fileSizeBytes: Number(input.fileSizeBytes || input.fileSize || 0),
    storageKey: input.storageKey || input.url || null,
    status: statusFrom(input) as any,
    note: String(input.note || input.notes || ''),
  };

  const artwork = id
    ? await prisma.artwork.update({ where: { id }, data, include: { versions: true } })
    : await prisma.artwork.create({ data, include: { versions: true } });

  return normalize(artwork);
}

export async function getArtworkProof(request: Request, id: string) {
  const tenantId = await tenantIdFromRequest(request);
  const artwork = await prisma.artwork.findFirst({
    where: { tenantId, id },
    include: { versions: true },
  });

  return artwork ? normalize(artwork) : null;
}

export async function listArtworkProofs(request: Request, options: { orderId?: string | null; status?: string | null; limit?: number } = {}) {
  const tenantId = await tenantIdFromRequest(request);
  const proofs = await prisma.artwork.findMany({
    where: {
      tenantId,
      ...(options.orderId ? { orderId: options.orderId } : {}),
      ...(options.status ? { status: statusFrom({ status: options.status }) as any } : {}),
    },
    include: { versions: true },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(100, Number(options.limit || 50))),
  });

  return proofs.map(normalize);
}

export async function addArtworkProofVersion(request: Request, artworkId: string, input: ProofInput) {
  const tenantId = await tenantIdFromRequest(request);
  const artwork = await prisma.artwork.findFirst({ where: { tenantId, id: artworkId }, include: { versions: true } });
  if (!artwork) throw new Error('Artwork proof was not found.');

  const versionNumber = Number(input.versionNumber || artwork.versions.length + 1);
  const version = await prisma.artworkVersion.create({
    data: {
      artworkId,
      versionNumber,
      storageKey: input.storageKey || input.url || null,
      note: String(input.note || input.notes || ''),
    },
  });

  const updated = await prisma.artwork.update({
    where: { id: artworkId },
    data: {
      storageKey: input.storageKey || input.url || artwork.storageKey,
      fileName: input.fileName || artwork.fileName,
      fileType: input.fileType || input.mimeType || artwork.fileType,
      fileSizeBytes: Number(input.fileSizeBytes || input.fileSize || artwork.fileSizeBytes || 0),
      status: statusFrom(input) as any,
      note: String(input.note || input.notes || artwork.note || ''),
    },
    include: { versions: true },
  });

  return { proof: normalize(updated), version };
}
