import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { StoredArtworkUpload } from '@/core/storefront/internal-artwork-storage';
import { readArtworkUploadMetadata, writeArtworkUploadMetadata } from '@/core/storefront/internal-artwork-storage';
import { getOrder, updateOrder } from '@/core/orders/orders.service';

export type ProductionJobTicket = {
  id: string;
  orderId?: string;
  orderNumber: string;
  artworkUploadId?: string;
  customerName?: string;
  customerEmail?: string;
  productId?: string;
  productName: string;
  quantity: number;
  dueDate: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'queued' | 'artwork-check' | 'proofing' | 'ready-to-print' | 'printing' | 'finishing' | 'packing' | 'dispatched' | 'blocked';
  artworkStatus: string;
  machine: string;
  material: string;
  route: string[];
  finishing: string[];
  supplier: string;
  notes?: string;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
  source: 'approved-artwork' | 'manual' | 'order';
};

type ProductionJobInput = Partial<ProductionJobTicket> & Record<string, any>;

function dataDir() {
  return path.join(process.cwd(), '.data');
}

function storePath() {
  return path.join(dataDir(), 'production-job-tickets.json');
}

async function readStore(): Promise<ProductionJobTicket[]> {
  await mkdir(dataDir(), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(storePath(), 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(items: ProductionJobTicket[]) {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(storePath(), JSON.stringify(items, null, 2));
  return items;
}

function safeDate(value?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function inferMachine(productName = '') {
  const name = productName.toLowerCase();
  if (name.includes('banner') || name.includes('poster') || name.includes('board') || name.includes('sign')) return 'Large Format Printer';
  if (name.includes('booklet') || name.includes('brochure')) return 'Ricoh Pro C5400S';
  if (name.includes('business card') || name.includes('flyer') || name.includes('leaflet')) return 'Ricoh Pro C5400S';
  return 'Unassigned';
}

function inferFinishing(productName = '') {
  const name = productName.toLowerCase();
  const steps: string[] = ['trim'];
  if (name.includes('booklet') || name.includes('brochure')) steps.push('fold', 'stitch');
  if (name.includes('fold')) steps.push('fold');
  if (name.includes('business card')) steps.push('stack-cut');
  if (name.includes('banner')) steps.push('eyelets/hem check');
  if (name.includes('board') || name.includes('sign')) steps.push('mount/trim check');
  return [...new Set(steps)];
}

function inferRoute(productName = '', supplier = 'internal') {
  if (supplier === 'supplier-api') return ['supplier-submit', 'supplier-production', 'dispatch'];
  const finishing = inferFinishing(productName);
  return ['prepress', 'print', ...(finishing.length ? ['finishing'] : []), 'dispatch'];
}

function preflightWarnings(upload: StoredArtworkUpload) {
  const preflight = upload.preflight as any;
  return [
    ...(Array.isArray(preflight?.preflight?.warnings) ? preflight.preflight.warnings : []),
    ...(Array.isArray(preflight?.preflight?.errors) ? preflight.preflight.errors : []),
  ].map(String);
}

function orderItemForUpload(order: any, upload: StoredArtworkUpload) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.find((item: any) => String(item.productId || item.sku || item.id) === String(upload.productId)) || items[0] || null;
}

function makeTicketId(uploadId?: string, orderId?: string) {
  if (uploadId) return `pjt_${uploadId.replace(/[^a-zA-Z0-9_-]+/g, '_')}`;
  if (orderId) return `pjt_${orderId.replace(/[^a-zA-Z0-9_-]+/g, '_')}`;
  return `pjt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listProductionJobTickets() {
  const items = await readStore();
  return items.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
}

export async function getProductionJobTicket(id: string) {
  const items = await readStore();
  return items.find((item) => item.id === id || item.artworkUploadId === id || item.orderId === id || item.orderNumber === id) || null;
}

export async function saveProductionJobTicket(input: ProductionJobInput) {
  const items = await readStore();
  const now = new Date().toISOString();
  const id = String(input.id || makeTicketId(input.artworkUploadId, input.orderId));
  const existing = items.find((item) => item.id === id);
  const next: ProductionJobTicket = {
    id,
    orderId: input.orderId || existing?.orderId,
    orderNumber: String(input.orderNumber || existing?.orderNumber || input.orderId || 'Manual job'),
    artworkUploadId: input.artworkUploadId || existing?.artworkUploadId,
    customerName: input.customerName || existing?.customerName || '',
    customerEmail: input.customerEmail || existing?.customerEmail || '',
    productId: input.productId || existing?.productId || '',
    productName: String(input.productName || existing?.productName || 'Production job'),
    quantity: Number(input.quantity || existing?.quantity || 1),
    dueDate: safeDate(input.dueDate || existing?.dueDate),
    priority: (input.priority || existing?.priority || 'normal') as ProductionJobTicket['priority'],
    status: (input.status || existing?.status || 'queued') as ProductionJobTicket['status'],
    artworkStatus: input.artworkStatus || existing?.artworkStatus || 'approved',
    machine: input.machine || existing?.machine || inferMachine(String(input.productName || existing?.productName || '')),
    material: input.material || existing?.material || '',
    route: Array.isArray(input.route) ? input.route : existing?.route || inferRoute(String(input.productName || existing?.productName || ''), input.supplier || existing?.supplier || 'internal'),
    finishing: Array.isArray(input.finishing) ? input.finishing : existing?.finishing || inferFinishing(String(input.productName || existing?.productName || '')),
    supplier: input.supplier || existing?.supplier || 'internal',
    notes: input.notes || existing?.notes || '',
    warnings: Array.isArray(input.warnings) ? input.warnings : existing?.warnings || [],
    source: (input.source || existing?.source || 'manual') as ProductionJobTicket['source'],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const updated = existing ? items.map((item) => item.id === id ? next : item) : [next, ...items];
  await writeStore(updated);
  return next;
}

export async function createProductionJobFromApprovedArtwork(request: Request, uploadInput: StoredArtworkUpload, options: Record<string, any> = {}) {
  const upload = await readArtworkUploadMetadata(uploadInput.id).catch(() => uploadInput);
  const existing = await getProductionJobTicket(upload.id);
  if (existing) return existing;

  const orderId = String(options.orderId || upload.orderId || '').trim();
  const order = orderId ? await getOrder(request, orderId).catch(() => null) : null;
  const orderItem = orderItemForUpload(order, upload);
  const productName = String(options.productName || orderItem?.productName || upload.productId || 'Approved artwork job');
  const quantity = Number(options.quantity || orderItem?.quantity || 1);
  const warnings = preflightWarnings(upload).filter(Boolean);
  const ticket = await saveProductionJobTicket({
    id: makeTicketId(upload.id, orderId),
    orderId: order?.id || orderId || upload.orderId,
    orderNumber: options.orderNumber || order?.orderNumber || orderId || upload.quoteId || upload.id,
    artworkUploadId: upload.id,
    customerName: options.customerName || order?.customerName || '',
    customerEmail: options.customerEmail || order?.customerEmail || '',
    productId: upload.productId || orderItem?.productId || '',
    productName,
    quantity,
    dueDate: safeDate(options.dueDate || order?.dueDate),
    priority: warnings.length ? 'high' : 'normal',
    status: 'ready-to-print',
    artworkStatus: 'approved',
    machine: options.machine || inferMachine(productName),
    material: options.material || orderItem?.metadataJson?.material || '',
    route: inferRoute(productName, options.supplier || 'internal'),
    finishing: inferFinishing(productName),
    supplier: options.supplier || 'internal',
    notes: options.note || `Created automatically when artwork ${upload.id} was approved.`,
    warnings,
    source: 'approved-artwork',
  });

  const nextUpload = {
    ...(upload as any),
    productionJobId: ticket.id,
    productionJobCreatedAt: ticket.createdAt,
    approvalHistory: [
      ...((upload as any).approvalHistory || []),
      { id: `production_${Date.now()}`, action: 'approved', actor: 'production-job-generator', note: `Production job ${ticket.id} created.`, createdAt: new Date().toISOString() },
    ],
  } as StoredArtworkUpload;
  await writeArtworkUploadMetadata(nextUpload).catch(() => null);

  if (orderId) {
    const currentNotes = Array.isArray(order?.internalNotes) ? order.internalNotes : [];
    await updateOrder(request, orderId, {
      status: 'IN_PRODUCTION',
      internalNotes: [...currentNotes, `Production job ${ticket.id} created from approved artwork ${upload.id}.`],
    }).catch(() => null);
  }

  return ticket;
}
