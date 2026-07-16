import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import type { TenantContext } from '@/core/tenant/types';
import type { StoredArtworkUpload } from './internal-artwork-storage';

const CONFIG_RESOURCE = 'admin-config' as any;
const TICKETS_KEY = 'production-job-tickets';

type BridgeInput = {
  ctx: TenantContext;
  orderId?: string;
  orderNumber: string;
  lineId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productName: string;
  productSlug: string;
  categorySlug?: string;
  quantity?: number;
  selectedDelivery?: string;
  fulfilmentMode?: string;
  deliveryAddress?: Record<string, any> | null;
  billingAddress?: Record<string, any> | null;
  artworkStatus: string;
  artworkNotes?: string;
  upload?: StoredArtworkUpload | null;
  priceMinor?: number;
  paymentStatus?: string;
  paymentProvider?: string;
  orderStatus?: string;
};

function todayPlus(days: number) { return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10); }
function normalisePayment(value?: string) { return String(value || '').trim().toLowerCase() || 'unknown'; }
function compactAddress(address?: Record<string, any> | null) { if (!address) return null; const out = Object.fromEntries(Object.entries(address).filter(([, value]) => String(value || '').trim())); return Object.keys(out).length ? out : null; }
function addressLine(address?: Record<string, any> | null) { const next = compactAddress(address); if (!next) return ''; return [next.line1, next.line2, next.town, next.county, next.postcode, next.country].filter(Boolean).join(', '); }
function statusFromUpload(input: BridgeInput) {
  if (input.artworkStatus === 'need-design') return { artworkStatus: 'design-required', preflightStatus: 'not-started', stage: 'proofing', status: 'artwork-check', handoffState: 'blocked', risk: 'high' };
  if (input.artworkStatus !== 'ready' || !input.upload) return { artworkStatus: 'missing', preflightStatus: 'not-started', stage: 'proofing', status: 'artwork-check', handoffState: 'needs-artwork', risk: 'medium' };
  const preflightStatus = String((input.upload.preflight as any)?.preflight?.status || '').toLowerCase();
  if (preflightStatus === 'blocked' || input.upload.reviewStatus === 'replacement-requested') return { artworkStatus: 'preflight-fail', preflightStatus: 'fail', stage: 'proofing', status: 'blocked', handoffState: 'blocked', risk: 'high' };
  if (preflightStatus === 'warning') return { artworkStatus: 'preflight-warning', preflightStatus: 'warning', stage: 'proofing', status: 'artwork-check', handoffState: 'needs-artwork', risk: 'medium' };
  if (preflightStatus === 'passed' || preflightStatus === 'pass') return { artworkStatus: 'preflight-pass', preflightStatus: 'pass', stage: 'proofing', status: 'artwork-check', handoffState: 'needs-approval', risk: 'low' };
  return { artworkStatus: 'uploaded', preflightStatus: 'pending', stage: 'proofing', status: 'artwork-check', handoffState: 'needs-artwork', risk: 'medium' };
}

function preflightMessages(upload?: StoredArtworkUpload | null) {
  const preflight = (upload?.preflight as any)?.preflight || {};
  const errors = Array.isArray(preflight.errors) ? preflight.errors : [];
  const warnings = Array.isArray(preflight.warnings) ? preflight.warnings : [];
  return [...errors, ...warnings].map(String).filter(Boolean);
}

async function readItems(ctx: TenantContext) {
  try {
    const record = await getInternalCatalogRecord(ctx, CONFIG_RESOURCE, TICKETS_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items as Record<string, any>[] : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}
async function saveItems(ctx: TenantContext, items: Record<string, any>[]) {
  return upsertInternalCatalogRecord(ctx, CONFIG_RESOURCE, { id: TICKETS_KEY, slug: TICKETS_KEY, name: 'Production Job Tickets', description: 'Manufacturing job tickets with storefront artwork, preflight, payment and production handoff', metadataJson: { items, savedAt: new Date().toISOString(), storageKey: TICKETS_KEY, source: 'storefront-artwork-production-bridge' } } as any);
}

export async function upsertArtworkProductionTicket(input: BridgeInput) {
  const now = new Date().toISOString();
  const state = statusFromUpload(input);
  const warnings = preflightMessages(input.upload);
  const lineKey = String(input.lineId || '').trim();
  const id = `pj-${input.orderNumber}${lineKey ? `-${lineKey}` : ''}`.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const paymentStatus = normalisePayment(input.paymentStatus || 'pending');
  const fulfilmentMode = input.fulfilmentMode || (String(input.selectedDelivery || '').toLowerCase().includes('deliver') ? 'delivery' : 'collection');
  const deliveryAddress = compactAddress(input.deliveryAddress);
  const billingAddress = compactAddress(input.billingAddress);
  const ticket = {
    id,
    lineId: lineKey || null,
    orderId: input.orderId || null,
    orderNumber: input.orderNumber,
    customerName: input.customerName || '',
    customerEmail: input.customerEmail || '',
    customerPhone: input.customerPhone || '',
    contactSnapshot: { name: input.customerName || '', email: input.customerEmail || '', phone: input.customerPhone || '' },
    productName: input.productName,
    productSlug: input.productSlug,
    categorySlug: input.categorySlug || '',
    quantity: input.quantity || 1,
    selectedDelivery: input.selectedDelivery || '',
    fulfilmentMode,
    deliveryAddress,
    billingAddress,
    deliveryAddressLine: addressLine(deliveryAddress),
    billingAddressLine: addressLine(billingAddress),
    priceMinor: input.priceMinor || 0,
    orderStatus: input.orderStatus || 'AWAITING_PAYMENT',
    paymentStatus,
    paymentProvider: input.paymentProvider || 'stripe',
    paymentGate: ['paid', 'captured', 'authorized'].includes(paymentStatus) ? 'paid' : 'awaiting-payment',
    plant: 'Default Production',
    stage: state.stage,
    status: state.status,
    artworkStatus: state.artworkStatus,
    preflightStatus: state.preflightStatus,
    customerProofStatus: state.artworkStatus === 'preflight-pass' ? 'pending-customer-approval' : 'pending-review',
    handoffState: state.handoffState,
    slaRisk: state.risk,
    risk: state.risk,
    dueDate: todayPlus(state.risk === 'high' ? 1 : 2),
    assignedOperator: 'Prepress Team',
    owner: 'Prepress Team',
    priority: state.risk === 'high' ? 'rush' : 'standard',
    productionNotes: [input.artworkNotes, input.upload ? `Artwork upload ${input.upload.id}: ${input.upload.originalName}` : 'Artwork not uploaded at checkout.', `Payment status: ${paymentStatus}.`, `Fulfilment: ${fulfilmentMode}${input.selectedDelivery ? ` / ${input.selectedDelivery}` : ''}.`, deliveryAddress ? `Delivery address: ${addressLine(deliveryAddress)}.` : '', input.customerPhone ? `Customer phone: ${input.customerPhone}.` : '', warnings.length ? warnings.join(' ') : ''].filter(Boolean).join(' '),
    artworkUploadId: input.upload?.id || null,
    artworkFileUrl: input.upload?.fileUrl || null,
    artworkDownloadUrl: input.upload?.downloadUrl || null,
    warnings,
    createdAt: now,
    updatedAt: now,
    source: 'native-storefront-checkout',
  };
  const items = await readItems(input.ctx);
  const next = [ticket, ...items.filter((item) => String(item.id) !== id)];
  await saveItems(input.ctx, next);
  return ticket;
}
