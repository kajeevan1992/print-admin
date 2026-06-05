import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

export type CollectionPassStatus = 'not-ready' | 'ready' | 'collected' | 'cancelled';

const RESOURCE = 'collection-handover-passes';
const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk').replace(/\/$/, '');

function parseJson(value: unknown) {
  if (!value) return {} as Record<string, any>;
  if (typeof value === 'object') return value as Record<string, any>;
  try { return JSON.parse(String(value)); } catch { return { note: String(value) }; }
}

function clean(value: unknown) { return String(value || '').trim(); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'collection-pass'; }
function shortHash(value: string, length = 18) { return crypto.createHash('sha256').update(value).digest('hex').slice(0, length); }
function pinFor(seed: string) { const hex = shortHash(seed, 12); return String(parseInt(hex.slice(0, 8), 16) % 1000000).padStart(6, '0'); }
function tokenFor(seed: string) { return `HPC-${shortHash(seed, 20).toUpperCase()}`; }

async function resolveTenantId(request: Request) {
  const ctx = tenantContextFromRequest(request);
  const value = clean(ctx.tenantId);
  const tenant = (value && (await prisma.tenant.findUnique({ where: { id: value }, select: { id: true } }).catch(() => null))) || (value && (await prisma.tenant.findUnique({ where: { slug: value }, select: { id: true } }).catch(() => null))) || (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }).catch(() => null));
  return tenant?.id || value || 'platform-demo';
}

async function loadOrder(request: Request, id: string) {
  const tenantId = await resolveTenantId(request);
  return prisma.order.findFirst({ where: { tenantId, OR: [{ id }, { orderNumber: id }] }, include: { items: true, customer: true } }).then((order) => order ? { tenantId, order } : { tenantId, order: null }).catch(() => ({ tenantId, order: null as any }));
}

function fulfilmentFrom(order: any) {
  const notes = parseJson(order?.notes);
  const raw = notes.rawCheckout || notes.checkout || {};
  const selection = raw.fulfilmentSelection || raw.delivery || notes.fulfilmentSelection || notes.delivery || {};
  const mode = clean(raw.fulfilmentMode || selection.mode || selection.fulfilmentMode || selection.type || '').toLowerCase();
  const shippingMethod = clean(notes.shippingMethod || selection.label || order?.shippingMethod || '');
  const isCollection = mode.includes('collection') || shippingMethod.toLowerCase().includes('collect');
  return {
    notes,
    raw,
    selection,
    isCollection,
    mode: mode || (isCollection ? 'collection' : 'delivery'),
    label: clean(selection.label || selection.publicLabel || shippingMethod || 'Collection'),
    locationId: clean(selection.locationId),
    locationSlug: clean(selection.locationSlug),
    locationType: clean(selection.locationType),
    address: selection.address || {},
    cutoffTime: clean(selection.cutoffTime),
    pickupInstructions: clean(selection.pickupInstructions),
    collectionTruth: clean(selection.collectionTruth),
  };
}

function readyStatus(order: any, existing?: any): CollectionPassStatus {
  if (existing?.status === 'collected') return 'collected';
  if (existing?.status === 'cancelled') return 'cancelled';
  const status = clean(order?.status).toUpperCase();
  if (['QUALITY_CHECK', 'DISPATCHED', 'DELIVERED'].includes(status)) return 'ready';
  return 'not-ready';
}

function addressText(address: any) {
  if (!address || typeof address !== 'object') return '';
  return [address.line1, address.line2, address.town || address.city, address.county, address.postcode, address.country].filter(Boolean).join(', ');
}

function customerFrom(order: any) {
  const notes = parseJson(order?.notes);
  return {
    name: clean(order?.customer?.name || notes.customer?.name || 'Customer'),
    email: email(order?.customer?.email || notes.customer?.email),
    phone: clean(notes.customer?.phone),
  };
}

function publicPass(pass: any) {
  if (!pass) return null;
  return {
    id: pass.id,
    token: pass.token,
    pin: pass.pin,
    status: pass.status,
    ready: pass.status === 'ready',
    orderId: pass.orderId,
    orderNumber: pass.orderNumber,
    customerName: pass.customerName,
    customerEmail: pass.customerEmail,
    fulfilmentMode: pass.fulfilmentMode,
    locationId: pass.locationId,
    locationSlug: pass.locationSlug,
    locationType: pass.locationType,
    locationLabel: pass.locationLabel,
    locationAddress: pass.locationAddress,
    pickupInstructions: pass.pickupInstructions,
    collectionTruth: pass.collectionTruth,
    cutoffTime: pass.cutoffTime,
    qrUrl: pass.qrUrl,
    qrPayload: pass.qrPayload,
    expiresAt: pass.expiresAt,
    collectedAt: pass.collectedAt || '',
    collectedBy: pass.collectedBy || '',
    verifiedAt: pass.verifiedAt || '',
    verificationCount: pass.verificationCount || 0,
    createdAt: pass.createdAt,
    updatedAt: pass.updatedAt,
  };
}

async function savePass(tenantId: string, pass: any) {
  const row = await (prisma as any).coreCatalogRecord.upsert({
    where: { tenantId_resource_slug: { tenantId, resource: RESOURCE, slug: pass.slug } },
    update: { name: pass.name, description: pass.description, metadataJson: pass },
    create: { id: pass.id, tenantId, resource: RESOURCE, slug: pass.slug, name: pass.name, description: pass.description, metadataJson: pass },
  });
  return row.metadataJson || pass;
}

export async function getOrCreateCollectionPass(request: Request, id: string, options: { email?: string; force?: boolean } = {}) {
  const { tenantId, order } = await loadOrder(request, id);
  if (!order) return { ok: false, available: false, reason: 'order-not-found', pass: null };
  const customer = customerFrom(order);
  const requestedEmail = email(options.email || '');
  if (requestedEmail && customer.email && requestedEmail !== customer.email) return { ok: false, available: false, reason: 'email-mismatch', pass: null };
  const fulfilment = fulfilmentFrom(order);
  if (!fulfilment.isCollection && !options.force) return { ok: true, available: false, reason: 'not-a-collection-order', fulfilment, pass: null };
  const seed = `${tenantId}:${order.id}:${order.orderNumber}:${customer.email || requestedEmail}:collection-handover-v1`;
  const token = tokenFor(seed);
  const pin = pinFor(seed);
  const passSlug = slug(`${order.orderNumber || order.id}-${token}`);
  const existingRow = await (prisma as any).coreCatalogRecord.findUnique({ where: { tenantId_resource_slug: { tenantId, resource: RESOURCE, slug: passSlug } } }).catch(() => null);
  const existing = existingRow?.metadataJson || null;
  const status = readyStatus(order, existing);
  const now = new Date().toISOString();
  const pass = {
    ...(existing || {}),
    id: existing?.id || `collection-pass-${shortHash(seed, 18)}`,
    slug: passSlug,
    token,
    pin,
    status,
    name: `Collection pass ${order.orderNumber || order.id}`,
    description: `Collection handover pass for ${order.orderNumber || order.id}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: customer.name,
    customerEmail: customer.email || requestedEmail,
    fulfilmentMode: fulfilment.mode,
    locationId: fulfilment.locationId,
    locationSlug: fulfilment.locationSlug,
    locationType: fulfilment.locationType,
    locationLabel: fulfilment.label || (fulfilment.locationSlug ? fulfilment.locationSlug : 'Collection'),
    locationAddress: addressText(fulfilment.address),
    pickupInstructions: fulfilment.pickupInstructions || 'Bring this collection PIN and your order confirmation when collecting.',
    collectionTruth: fulfilment.collectionTruth,
    cutoffTime: fulfilment.cutoffTime,
    qrUrl: `${SITE_URL}/collection-pass?token=${encodeURIComponent(token)}`,
    qrPayload: JSON.stringify({ type: 'holo-print-collection-pass', token, orderNumber: order.orderNumber, pin }),
    expiresAt: existing?.expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
    verificationCount: existing?.verificationCount || 0,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const saved = await savePass(tenantId, pass);
  return { ok: true, available: true, reason: '', pass: publicPass(saved) };
}

export async function verifyCollectionPass(request: Request, input: { token?: string; pin?: string; orderId?: string; markCollected?: boolean; collectedBy?: string; note?: string }) {
  const tenantId = await resolveTenantId(request);
  const token = clean(input.token).toUpperCase();
  const pin = clean(input.pin).replace(/\D/g, '');
  const orderId = clean(input.orderId);
  const rows = await (prisma as any).coreCatalogRecord.findMany({ where: { tenantId, resource: RESOURCE }, orderBy: { updatedAt: 'desc' }, take: 200 }).catch(() => []);
  const row = rows.find((entry: any) => {
    const pass = entry.metadataJson || {};
    return (token && clean(pass.token).toUpperCase() === token) || (pin && clean(pass.pin) === pin && (!orderId || pass.orderId === orderId || pass.orderNumber === orderId));
  });
  if (!row) return { ok: false, verified: false, reason: 'pass-not-found', pass: null };
  const pass = row.metadataJson || {};
  if (pass.expiresAt && new Date(pass.expiresAt).getTime() < Date.now()) return { ok: false, verified: false, reason: 'pass-expired', pass: publicPass(pass) };
  const next = {
    ...pass,
    status: input.markCollected ? 'collected' : pass.status,
    verifiedAt: new Date().toISOString(),
    verificationCount: Number(pass.verificationCount || 0) + 1,
    collectedAt: input.markCollected ? new Date().toISOString() : pass.collectedAt || '',
    collectedBy: input.markCollected ? clean(input.collectedBy || 'storefront-admin') : pass.collectedBy || '',
    collectionNote: input.note || pass.collectionNote || '',
    updatedAt: new Date().toISOString(),
  };
  const saved = await savePass(tenantId, next);
  return { ok: true, verified: true, reason: '', pass: publicPass(saved) };
}

export async function listCollectionPasses(request: Request, filters: { status?: string; search?: string } = {}) {
  const tenantId = await resolveTenantId(request);
  const rows = await (prisma as any).coreCatalogRecord.findMany({ where: { tenantId, resource: RESOURCE }, orderBy: { updatedAt: 'desc' }, take: 200 }).catch(() => []);
  let items = rows.map((row: any) => publicPass(row.metadataJson || {})).filter(Boolean) as any[];
  if (filters.status && filters.status !== 'all') items = items.filter((item) => item.status === filters.status);
  const q = clean(filters.search).toLowerCase();
  if (q) items = items.filter((item) => [item.orderNumber, item.customerName, item.customerEmail, item.locationLabel, item.pin, item.token].join(' ').toLowerCase().includes(q));
  const summary = { total: items.length, ready: items.filter((i) => i.status === 'ready').length, notReady: items.filter((i) => i.status === 'not-ready').length, collected: items.filter((i) => i.status === 'collected').length, cancelled: items.filter((i) => i.status === 'cancelled').length };
  return { items, summary, resource: RESOURCE };
}
