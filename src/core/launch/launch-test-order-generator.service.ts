import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { saveOrder, getOrder, listOrders } from '@/core/orders/orders.service';
import { getOrCreateCollectionPass } from '@/core/collection/collection-handover.service';
import { queueCollectionNotification } from '@/core/collection/collection-notifications.service';
import { runReadyCollectionAutomationForOrderId } from '@/core/collection/ready-collection-automation.service';
import { buildOrderVatSummary } from '@/core/tax/order-vat-summary';

type TestScenario = 'collection' | 'design-proof';

type GeneratorOptions = {
  mode?: 'preview' | 'create';
  scenario?: TestScenario | string;
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
const CONFIG_RESOURCE = 'admin-config' as any;
const DESIGN_BRIEFS_KEY = 'customer-design-briefs-v1';
const TICKETS_KEY = 'production-job-tickets';

function clean(value: unknown) { return String(value || '').trim(); }
function upper(value: unknown) { return clean(value).toUpperCase().replace(/-/g, '_'); }
function nowStamp() { return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14); }
function money(value: number) { return Math.round(value * 100); }
function splitName(name: string) { const parts = clean(name).split(/\s+/); return { firstName: parts[0] || 'Launch', lastName: parts.slice(1).join(' ') || 'Tester' }; }
function scenario(value: unknown): TestScenario { return clean(value) === 'design-proof' ? 'design-proof' : 'collection'; }
function appBase(request: Request) { const url = new URL(request.url); return `${url.protocol}//${url.host}`; }

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
  const selectedScenario = scenario(options.scenario);
  const status = selectedScenario === 'design-proof' ? upper(options.status || 'ARTWORK_CHECK') : upper(options.status || 'QUALITY_CHECK');
  const location = locationFor(options.locationSlug || 'sidcup');
  const productSlug = clean(options.productSlug || 'business-cards') || 'business-cards';
  const customerName = clean(options.customerName || (selectedScenario === 'design-proof' ? 'Launch Design Proof Customer' : 'Launch Test Customer'));
  const split = splitName(customerName);
  const customerEmail = clean(options.customerEmail || 'launch-test@holoprint.co.uk').toLowerCase();
  const orderNumber = `TEST-HOLO-${nowStamp()}`;
  const scenarioLabel = selectedScenario === 'design-proof' ? 'DESIGN PROOF' : 'COLLECTION VAT';
  return {
    source: TEST_SOURCE,
    orderNumber,
    status,
    currency: 'GBP',
    customerName,
    customerEmail,
    customer: { ...split, name: customerName, email: customerEmail, phone: '020 3336 0322', company: 'Holo Print Launch Test' },
    contactSnapshot: { name: customerName, email: customerEmail, phone: '020 3336 0322', company: 'Holo Print Launch Test' },
    billingAddress: { line1: 'Launch Test Billing Address', city: 'Sidcup', postcode: 'DA14 TEST', country: 'United Kingdom' },
    shippingAddress: { line1: 'Holo Print Sidcup', city: 'Sidcup', postcode: 'DA14 TEST', country: 'United Kingdom' },
    delivery: location,
    fulfilmentMode: location.fulfilmentMode,
    fulfilmentChoice: location.locationSlug,
    fulfilmentSelection: location,
    fulfilmentSnapshot: { mode: location.fulfilmentMode, label: location.label, addressLine: 'Holo Print Sidcup, Sidcup, DA14 TEST', testScenario: selectedScenario },
    shippingMethod: location.label,
    shippingMinor: location.priceMinor,
    paymentMethod: 'Test / no payment',
    paymentStatus: selectedScenario === 'design-proof' ? 'manual-paid' : 'test-only',
    notes: `BUILD 67 TEST DATA — ${scenarioLabel} safe launch test order. Do not produce or invoice.`,
    internalNotes: ['BUILD 67 TEST DATA', `Scenario: ${selectedScenario}`, 'Generated by Launch Test Order Generator', 'Do not produce', 'Do not invoice'],
    rawCheckout: {
      source: TEST_SOURCE,
      isTestData: true,
      scenario: selectedScenario,
      productSlug,
      fulfilmentMode: location.fulfilmentMode,
      fulfilmentChoice: location.locationSlug,
      fulfilmentSelection: location,
      delivery: location,
      paymentMethod: 'Test / no payment',
      launchTestMarker: 'BUILD_67_SAFE_TEST_ORDER',
    },
    items: [
      { productId: productSlug, productName: selectedScenario === 'design-proof' ? 'Business Cards Design Proof Launch Test' : 'Business Cards Launch Test', name: selectedScenario === 'design-proof' ? 'Business Cards Design Proof Launch Test' : 'Business Cards Launch Test', quantity: 1, totalPriceMinor: money(19), taxSettings: { preset: 'business-cards', taxClass: 'standard' }, metadataJson: { isTestData: true, launchTestMarker: 'BUILD_67', scenario: selectedScenario, productSlug, artworkStatus: selectedScenario === 'design-proof' ? 'need-design' : 'send-later' } },
      { productId: 'flyers-leaflets', productName: 'A5 Flyers / Leaflets Launch Test', name: 'A5 Flyers / Leaflets Launch Test', quantity: 1, totalPriceMinor: money(29), taxSettings: { preset: 'leaflets-flyers', taxClass: 'zero' }, metadataJson: { isTestData: true, launchTestMarker: 'BUILD_67', scenario: selectedScenario, productSlug: 'flyers-leaflets' } },
      { productId: 'design-service', productName: selectedScenario === 'design-proof' ? 'Design Proof Service Launch Test' : 'Design Service Launch Test', name: selectedScenario === 'design-proof' ? 'Design Proof Service Launch Test' : 'Design Service Launch Test', quantity: 1, totalPriceMinor: money(40), taxSettings: { taxClass: 'zero', forceVatOnDesignServices: true }, metadataJson: { isTestData: true, launchTestMarker: 'BUILD_67', scenario: selectedScenario, serviceType: 'design' } },
    ],
    totals: { currency: 'GBP', deliveryMinor: location.priceMinor },
    quoteRequired: selectedScenario === 'design-proof',
    checkoutBlocked: false,
    isTestData: true,
    testScenario: selectedScenario,
    launchTestMarker: 'BUILD_67_SAFE_TEST_ORDER',
  };
}

function validateCreatedOrder(order: any) {
  const taxSummary = buildOrderVatSummary(order);
  const hasCollection = String(order.shippingMethod || '').toLowerCase().includes('collect') || String(order.notes || '').toLowerCase().includes('collection');
  const hasZeroVat = (taxSummary.vatBreakdown || []).some((row: any) => Number(row.rate) === 0);
  const hasStandardVat = (taxSummary.vatBreakdown || []).some((row: any) => Number(row.rate) === 20);
  const isDesignScenario = String(order.rawCheckout?.scenario || order.testScenario || '').includes('design-proof') || JSON.stringify(order).includes('Design Proof');
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerEmail: order.customerEmail,
    total: order.total,
    taxSummary,
    scenario: isDesignScenario ? 'design-proof' : 'collection',
    checks: {
      saved: Boolean(order.id),
      testMarked: String(order.notes || '').includes('BUILD 67') || JSON.stringify(order).includes('BUILD_67_SAFE_TEST_ORDER'),
      collectionSaved: hasCollection,
      mixedVat: Boolean(taxSummary.isMixedVat || (hasZeroVat && hasStandardVat)),
      zeroVatPresent: hasZeroVat,
      standardVatPresent: hasStandardVat,
      designScenario: isDesignScenario,
    },
  };
}

async function readItems(request: Request, key: string) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const metadata = (record as any)?.metadataJson || {};
    if (Array.isArray(metadata.items)) return metadata.items as Record<string, any>[];
    if (Array.isArray(metadata.store?.items)) return metadata.store.items as Record<string, any>[];
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

async function writeItems(request: Request, key: string, title: string, items: Record<string, any>[]) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: key,
    slug: key,
    name: title,
    title,
    description: title,
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: key, source: TEST_SOURCE },
  } as any);
}

function matchStored(item: Record<string, any>, order: any, briefId?: string) {
  const keys = [order.id, order.orderNumber, briefId].filter(Boolean).map(String);
  return keys.some((key) => [item.orderId, item.orderNumber, item.designBriefId, item.id].filter(Boolean).map(String).includes(key));
}

async function createDesignProofTestJourney(request: Request, order: any, options: GeneratorOptions = {}) {
  const at = new Date().toISOString();
  const proofVersion = 1;
  const proofToken = `test-${nowStamp()}-${Math.random().toString(36).slice(2, 10)}`;
  const productSlug = clean(options.productSlug || order.rawCheckout?.productSlug || 'business-cards') || 'business-cards';
  const briefId = `brief-${order.orderNumber}`.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const ticketId = `pj-${order.orderNumber}`.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const proofUrl = `${appBase(request)}/artwork-preflight?launchTestProof=${encodeURIComponent(order.orderNumber)}`;
  const reviewUrl = `/proof-action?orderId=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(order.customerEmail || '')}&proofToken=${encodeURIComponent(proofToken)}&proofVersion=${proofVersion}`;
  const event = { id: `proof-event-${nowStamp()}`, at, action: 'proof-sent', actor: 'launch-test-order-generator', note: 'BUILD 67 TEST DATA — generated to verify design proof approval journey.', proofVersion, proofToken, designProofUrl: proofUrl, reviewUrl, emailStatus: 'test-not-sent', productionReleaseState: 'blocked-test' };
  const brief = {
    id: briefId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    productName: 'Business Cards Design Proof Launch Test',
    productSlug,
    designType: 'Launch test design-help proof',
    designGoal: 'Verify customer design brief, proof token/version, Track Order and proof approval links before launch.',
    suppliedText: 'BUILD 67 TEST DATA — do not produce.',
    logoStatus: 'No real customer assets. Test only.',
    brandColours: 'Holo Print launch blue.',
    mustInclude: 'Clearly marked launch test data.',
    avoid: 'Do not print, invoice or dispatch.',
    budgetExpectation: 'Test only',
    deadline: 'Launch readiness test',
    status: 'submitted',
    designBriefStatus: 'submitted',
    designQuoteStatus: 'proof-sent',
    designWorkState: 'proof-sent',
    designQuotePaymentStatus: 'test-paid',
    customerProofStatus: 'pending-customer-approval',
    designProofUrl: proofUrl,
    proofVersion,
    proofToken,
    proofSentAt: at,
    proofEvents: [event],
    isTestData: true,
    launchTestMarker: 'BUILD_67_SAFE_TEST_ORDER',
    submittedAt: at,
    reviewedAt: at,
    reviewedBy: 'launch-test-order-generator',
    updatedAt: at,
    history: [{ at, action: 'launch-test-design-proof-created', note: 'Safe design proof test journey created.', proofVersion, proofToken }],
  };
  const ticket = {
    id: ticketId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    designBriefId: briefId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customer?.phone || order.contactSnapshot?.phone || '',
    productName: 'Business Cards Design Proof Launch Test',
    productSlug,
    categorySlug: 'business-cards',
    quantity: 1,
    selectedDelivery: order.shippingMethod || 'Collect from Holo Print Sidcup',
    fulfilmentMode: order.fulfilmentMode || 'store-collection',
    fulfilmentSnapshot: order.fulfilmentSnapshot || order.fulfilmentSelection || {},
    deliveryAddress: order.shippingAddress || {},
    billingAddress: order.billingAddress || {},
    priceMinor: 5900,
    orderStatus: order.status || 'ARTWORK_CHECK',
    paymentStatus: 'manual-paid',
    paymentProvider: 'test',
    paymentGate: 'paid',
    plant: 'Default Production',
    stage: 'proofing',
    status: 'artwork-check',
    artworkStatus: 'design-proof-ready',
    preflightStatus: 'pass',
    customerProofStatus: 'pending-customer-approval',
    handoffState: 'blocked',
    designQuoteStatus: 'proof-sent',
    designQuotePaymentStatus: 'test-paid',
    designProofUrl: proofUrl,
    proofPreviewUrl: proofUrl,
    proofToken,
    proofVersion,
    proofSentAt: at,
    proofEvents: [event],
    blockReason: 'BUILD 67 TEST DATA — proof sent to customer; production remains blocked until approval. Do not produce.',
    slaRisk: 'low',
    risk: 'low',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    assignedOperator: 'Prepress Team',
    owner: 'Prepress Team',
    priority: 'standard',
    productionNotes: 'BUILD 67 TEST DATA — design proof test ticket. Do not produce, invoice or dispatch.',
    isTestData: true,
    launchTestMarker: 'BUILD_67_SAFE_TEST_ORDER',
    source: TEST_SOURCE,
    createdAt: at,
    updatedAt: at,
  };

  const briefs = await readItems(request, DESIGN_BRIEFS_KEY).catch(() => []);
  const tickets = await readItems(request, TICKETS_KEY).catch(() => []);
  await writeItems(request, DESIGN_BRIEFS_KEY, 'Customer Design Briefs', [brief, ...briefs.filter((item) => !matchStored(item, order, briefId))]);
  await writeItems(request, TICKETS_KEY, 'Production Job Tickets', [ticket, ...tickets.filter((item) => !matchStored(item, order, briefId))]);
  return {
    ok: true,
    brief,
    ticket,
    links: {
      designBriefs: '/design-briefs',
      proofAction: reviewUrl,
      trackOrder: `/track-order?orderId=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(order.customerEmail || '')}`,
      readiness: '/launch-design-proof-readiness',
    },
    checks: {
      designBriefCreated: Boolean(brief.id),
      productionTicketCreated: Boolean(ticket.id),
      proofTokenCreated: Boolean(proofToken),
      proofVersionCreated: proofVersion === 1,
      proofEventCreated: ticket.proofEvents.length > 0,
      productionBlockedUntilApproval: ticket.handoffState === 'blocked',
    },
  };
}

export async function previewLaunchTestOrder(request: Request, options: GeneratorOptions = {}) {
  const tenant = await tenantInfo(request);
  const selectedScenario = scenario(options.scenario);
  const payload = buildLaunchTestOrderPayload({ ...options, scenario: selectedScenario });
  return {
    ok: true,
    mode: 'preview',
    scenario: selectedScenario,
    safe: true,
    tenant,
    confirmationRequired: CONFIRM_TEXT,
    payload,
    designProofPreview: selectedScenario === 'design-proof' ? {
      willCreateDesignBrief: true,
      willCreateProductionTicket: true,
      willCreateProofToken: true,
      productionWillRemainBlocked: true,
      pagesToVerify: ['/design-briefs', '/proof-action', '/track-order', '/launch-design-proof-readiness'],
    } : null,
    notes: ['Preview only. No order has been created.', 'POST with confirm=CREATE_TEST_ORDER to create test data.'],
  };
}

export async function createLaunchTestOrder(request: Request, options: GeneratorOptions = {}) {
  const selectedScenario = scenario(options.scenario);
  const payload = buildLaunchTestOrderPayload({ ...options, scenario: selectedScenario });
  const order = await saveOrder(request, payload);
  const validation = validateCreatedOrder(order);
  const generatePass = options.generatePass !== false && selectedScenario === 'collection';
  const runAutomation = options.runAutomation !== false && selectedScenario === 'collection';
  const queueNotification = options.queueNotification !== false && selectedScenario === 'collection';

  const pass = generatePass ? await getOrCreateCollectionPass(request, order.id || order.orderNumber, { email: order.customerEmail, force: true }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Collection pass generation failed.' })) : null;
  const automation = runAutomation ? await runReadyCollectionAutomationForOrderId(request, order.id || order.orderNumber, { force: true, sendNow: false, source: TEST_SOURCE }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Ready automation failed.' })) : null;
  const notification = queueNotification && !runAutomation ? await queueCollectionNotification(request, order.id || order.orderNumber, { force: true, sendWhenNotReady: true, createdBy: TEST_SOURCE }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Notification queue failed.' })) : null;
  const designProof = selectedScenario === 'design-proof' ? await createDesignProofTestJourney(request, order, options).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Design proof test journey failed.' })) : null;
  const stored = await getOrder(request, order.id).catch(() => order);
  return {
    ok: true,
    mode: 'create',
    scenario: selectedScenario,
    safe: true,
    order: stored || order,
    validation: { ...validation, checks: { ...validation.checks, designBriefCreated: Boolean((designProof as any)?.checks?.designBriefCreated), productionTicketCreated: Boolean((designProof as any)?.checks?.productionTicketCreated), proofTokenCreated: Boolean((designProof as any)?.checks?.proofTokenCreated), proofEventCreated: Boolean((designProof as any)?.checks?.proofEventCreated), productionBlockedUntilApproval: Boolean((designProof as any)?.checks?.productionBlockedUntilApproval) } },
    collectionPass: pass,
    automation,
    notification,
    designProof,
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
