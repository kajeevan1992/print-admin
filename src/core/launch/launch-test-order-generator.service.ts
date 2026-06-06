import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { saveOrder, getOrder, listOrders } from '@/core/orders/orders.service';
import { getOrCreateCollectionPass } from '@/core/collection/collection-handover.service';
import { queueCollectionNotification } from '@/core/collection/collection-notifications.service';
import { runReadyCollectionAutomationForOrderId } from '@/core/collection/ready-collection-automation.service';
import { buildOrderVatSummary } from '@/core/tax/order-vat-summary';

type GeneratorOptions = {
  mode?: 'preview' | 'create';
  status?: string;
  productSlug?: string;
  locationSlug?: string;
  customerEmail?: string;
  customerName?: string;
  generatePass?: boolean;
  queueNotification?: boolean;
  runAutomation?: boolean;
};

const TEST_SOURCE = 'build-67-launch-test-order-generator';
const CONFIRM_TEXT = 'CREATE_TEST_ORDER';

function clean(value: unknown) { return String(value || '').trim(); }
function upper(value: unknown) { return clean(value).toUpperCase().replace(/-/g, '_'); }
function nowStamp() { return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14); }
function money(value: number) { return Math.round(value * 100); }
function splitName(name: string) { const parts = clean(name).split(/\s+/); return { firstName: parts[0] || 'Launch', lastName: parts.slice(1).join(' ') || 'Tester' }; }

async function tenantInfo(request: Request) {
  const ctx = tenantContextFromRequest(request);
  const value = clean(ctx.tenantId);
  const tenant =
    (value && (await (prisma as any).tenant.findUnique({ where: { id: value } }).catch(() => null))) ||
    (value && (await (prisma as any).tenant.findUnique({ where: { slug: value } }).catch(() => null))) ||
    (await (prisma as any).tenant.findFirst({ orderBy: { createdAt: 'asc' } }).catch(() => null));
  return { tenantId: tenant?.id || value || 'platform-demo', tenantName: tenant?.name || 'HOLO PRINT', tenantSlug: tenant?.slug || value || 'demo' };
}

function locationFor(slug: string) {
  const cleanSlug = clean(slug || 'sidcup').toLowerCase();
  if (cleanSlug === 'wimbledon' || cleanSlug === 'kingston') {
    return {
      locationId: `loc-${cleanSlug}`,
      locationSlug: cleanSlug,
      locationType: 'partner-collection-point',
      label: `Collect from ${cleanSlug.charAt(0).toUpperCase()}${cleanSlug.slice(1)} partner point`,
      mode: 'partner-collection',
      fulfilmentMode: 'partner-collection',
      type: 'partner-collection',
      publicLabel: `Collect from ${cleanSlug.charAt(0).toUpperCase()}${cleanSlug.slice(1)} partner point`,
      priceMinor: 0,
      vatRate: 20,
      cutoffTime: '13:00',
      address: { town: cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1), country: 'GB' },
      pickupInstructions: 'Partner collection details will be confirmed before collection. Bring the test order confirmation/PIN.',
      collectionTruth: 'Partner collection point, not a Holo Print branch.',
      requiresManualApproval: true,
    };
  }
  return {
    locationId: 'loc-sidcup',
    locationSlug: 'sidcup',
    locationType: 'main-store',
    label: 'Collect from Holo Print Sidcup',
    mode: 'store-collection',
    fulfilmentMode: 'store-collection',
    type: 'store-collection',
    publicLabel: 'Collect from Holo Print Sidcup',
    priceMinor: 0,
    vatRate: 20,
    cutoffTime: '15:00',
    address: { line1: 'Sidcup High Street', town: 'Sidcup', country: 'GB' },
    pickupInstructions: 'Bring the collection PIN and order confirmation. This is launch test data.',
    collectionTruth: 'Holo Print store and production base.',
    requiresManualApproval: false,
  };
}

export function buildLaunchTestOrderPayload(options: GeneratorOptions = {}) {
  const status = upper(options.status || 'QUALITY_CHECK');
  const location = locationFor(options.locationSlug || 'sidcup');
  const productSlug = clean(options.productSlug || 'business-cards') || 'business-cards';
  const customerName = clean(options.customerName || 'Launch Test Customer');
  const split = splitName(customerName);
  const customerEmail = clean(options.customerEmail || 'launch-test@holoprint.co.uk').toLowerCase();
  const orderNumber = `TEST-HOLO-${nowStamp()}`;
  return {
    source: TEST_SOURCE,
    orderNumber,
    status,
    currency: 'GBP',
    customerName,
    customerEmail,
    customer: { ...split, name: customerName, email: customerEmail, phone: '020 3336 0322', company: 'Holo Print Launch Test' },
    billingAddress: { line1: 'Launch Test Billing Address', city: 'Sidcup', postcode: 'DA14 TEST', country: 'United Kingdom' },
    shippingAddress: { line1: 'Holo Print Sidcup', city: 'Sidcup', postcode: 'DA14 TEST', country: 'United Kingdom' },
    delivery: location,
    fulfilmentMode: location.fulfilmentMode,
    fulfilmentChoice: location.locationSlug,
    fulfilmentSelection: location,
    shippingMethod: location.label,
    shippingMinor: location.priceMinor,
    paymentMethod: 'Test / no payment',
    paymentStatus: 'test-only',
    notes: 'BUILD 67 TEST DATA — safe launch test order. Do not produce or invoice.',
    internalNotes: ['BUILD 67 TEST DATA', 'Generated by Launch Test Order Generator', 'Do not produce', 'Do not invoice'],
    rawCheckout: {
      source: TEST_SOURCE,
      isTestData: true,
      productSlug,
      fulfilmentMode: location.fulfilmentMode,
      fulfilmentChoice: location.locationSlug,
      fulfilmentSelection: location,
      delivery: location,
      paymentMethod: 'Test / no payment',
      launchTestMarker: 'BUILD_67_SAFE_TEST_ORDER',
    },
    items: [
      { productId: productSlug, productName: 'Business Cards Launch Test', name: 'Business Cards Launch Test', quantity: 1, totalPriceMinor: money(19), taxSettings: { preset: 'business-cards', taxClass: 'standard' }, metadataJson: { isTestData: true, launchTestMarker: 'BUILD_67', productSlug } },
      { productId: 'flyers-leaflets', productName: 'A5 Flyers / Leaflets Launch Test', name: 'A5 Flyers / Leaflets Launch Test', quantity: 1, totalPriceMinor: money(29), taxSettings: { preset: 'leaflets-flyers', taxClass: 'zero' }, metadataJson: { isTestData: true, launchTestMarker: 'BUILD_67', productSlug: 'flyers-leaflets' } },
      { productId: 'design-service', productName: 'Design Service Launch Test', name: 'Design Service Launch Test', quantity: 1, totalPriceMinor: money(40), taxSettings: { taxClass: 'zero', forceVatOnDesignServices: true }, metadataJson: { isTestData: true, launchTestMarker: 'BUILD_67', serviceType: 'design' } },
    ],
    totals: { currency: 'GBP', deliveryMinor: location.priceMinor },
    quoteRequired: false,
    checkoutBlocked: false,
    isTestData: true,
    launchTestMarker: 'BUILD_67_SAFE_TEST_ORDER',
  };
}

function validateCreatedOrder(order: any) {
  const taxSummary = buildOrderVatSummary(order);
  const hasCollection = String(order.shippingMethod || '').toLowerCase().includes('collect') || String(order.notes || '').toLowerCase().includes('collection');
  const hasZeroVat = (taxSummary.vatBreakdown || []).some((row: any) => Number(row.rate) === 0);
  const hasStandardVat = (taxSummary.vatBreakdown || []).some((row: any) => Number(row.rate) === 20);
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerEmail: order.customerEmail,
    total: order.total,
    taxSummary,
    checks: {
      saved: Boolean(order.id),
      testMarked: String(order.notes || '').includes('BUILD 67') || JSON.stringify(order).includes('BUILD_67_SAFE_TEST_ORDER'),
      collectionSaved: hasCollection,
      mixedVat: Boolean(taxSummary.isMixedVat || (hasZeroVat && hasStandardVat)),
      zeroVatPresent: hasZeroVat,
      standardVatPresent: hasStandardVat,
    },
  };
}

export async function previewLaunchTestOrder(request: Request, options: GeneratorOptions = {}) {
  const tenant = await tenantInfo(request);
  const payload = buildLaunchTestOrderPayload(options);
  return {
    ok: true,
    mode: 'preview',
    safe: true,
    tenant,
    confirmationRequired: CONFIRM_TEXT,
    payload,
    notes: ['Preview only. No order has been created.', 'POST with confirm=CREATE_TEST_ORDER to create test data.'],
  };
}

export async function createLaunchTestOrder(request: Request, options: GeneratorOptions = {}) {
  const payload = buildLaunchTestOrderPayload(options);
  const order = await saveOrder(request, payload);
  const validation = validateCreatedOrder(order);
  const generatePass = options.generatePass !== false;
  const runAutomation = options.runAutomation !== false;
  const queueNotification = options.queueNotification !== false;

  const pass = generatePass ? await getOrCreateCollectionPass(request, order.id || order.orderNumber, { email: order.customerEmail, force: true }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Collection pass generation failed.' })) : null;
  const automation = runAutomation ? await runReadyCollectionAutomationForOrderId(request, order.id || order.orderNumber, { force: true, sendNow: false, source: 'build-67-launch-test-order-generator' }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Ready automation failed.' })) : null;
  const notification = queueNotification && !runAutomation ? await queueCollectionNotification(request, order.id || order.orderNumber, { force: true, sendWhenNotReady: true, createdBy: 'build-67-launch-test-order-generator' }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Notification queue failed.' })) : null;
  const stored = await getOrder(request, order.id).catch(() => order);
  return {
    ok: true,
    mode: 'create',
    safe: true,
    order: stored || order,
    validation,
    collectionPass: pass,
    automation,
    notification,
    customerOrderPath: `/account/orders/${order.id}`,
    customerEmail: order.customerEmail,
    warning: 'This is clearly marked BUILD 67 TEST DATA. Do not produce, invoice or dispatch it.',
  };
}

export async function listLaunchTestOrders(request: Request) {
  const orders = await listOrders(request, { limit: 100 });
  const items = orders.filter((order: any) => String(order.orderNumber || '').startsWith('TEST-HOLO-') || JSON.stringify(order).includes('BUILD_67_SAFE_TEST_ORDER') || String(order.notes || '').includes('BUILD 67'));
  return { items, count: items.length, latest: items[0] || null };
}

export function launchTestConfirmationText() {
  return CONFIRM_TEXT;
}
