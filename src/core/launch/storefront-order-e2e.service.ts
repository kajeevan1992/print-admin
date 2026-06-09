import { buildCartItem, estimateDelivery, summarizeCart } from '@/core/storefront/cart-checkout-bridge';
import { StorefrontHttpError, validateCartSnapshot, validateCheckoutReadiness } from '@/core/storefront/storefront-integrity';
import { decideCheckoutPayment } from '@/core/payments/payment-rules';
import { saveOrder } from '@/core/orders/orders.service';
import { listFulfilmentLocations } from '@/core/locations/location-manager.service';

export type StorefrontE2eSeverity = 'pass' | 'warning' | 'error' | 'info';
export type StorefrontE2eStep = {
  id: string;
  label: string;
  severity: StorefrontE2eSeverity;
  detail: string;
  action?: string;
};

type ScenarioMode = 'dry-run' | 'create-test-order';

type ScenarioResult = {
  id: string;
  label: string;
  mode: ScenarioMode;
  steps: StorefrontE2eStep[];
  items: Array<Record<string, any>>;
  totals: Record<string, any>;
  payload: Record<string, any>;
  order?: Record<string, any>;
  paymentDecision: Record<string, any>;
  fulfilment: Record<string, any>;
  ready: boolean;
};

function text(value: unknown) { return String(value || '').trim(); }
function minor(value: unknown) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0; }
function pass(id: string, label: string, detail: string, action = ''): StorefrontE2eStep { return { id, label, severity: 'pass', detail, action }; }
function warn(id: string, label: string, detail: string, action = ''): StorefrontE2eStep { return { id, label, severity: 'warning', detail, action }; }
function fail(id: string, label: string, detail: string, action = ''): StorefrontE2eStep { return { id, label, severity: 'error', detail, action }; }
function info(id: string, label: string, detail: string, action = ''): StorefrontE2eStep { return { id, label, severity: 'info', detail, action }; }

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(16).slice(2, 8)}`;
}

function vatRates(items: Array<Record<string, any>>) {
  const rates = new Set<number>();
  for (const item of items) {
    rates.add(Number(item.vatRate || 0));
    for (const addOn of Array.isArray(item.addOns) ? item.addOns : []) rates.add(Number(addOn.vatRate || 0));
  }
  return [...rates].sort((a, b) => a - b);
}

function checkoutCustomer() {
  return {
    name: 'Holo Launch Test Customer',
    email: 'launch-test@holoprint.co.uk',
    phone: '020 3336 0322',
    company: 'Holo Print E2E Test',
  };
}

function collectionFulfilment(location: Record<string, any> | null) {
  const fallback = location || { id: 'sidcup-main-store', slug: 'sidcup', name: 'Sidcup main store', type: 'owned-branch', collectionTruth: 'owned branch' };
  return {
    id: `collection:${fallback.slug || fallback.id || 'sidcup'}`,
    type: 'collection',
    fulfilmentMode: 'collection',
    value: `collection:${fallback.slug || fallback.id || 'sidcup'}`,
    label: `Collect from ${fallback.name || fallback.areaName || 'Sidcup'}`,
    publicLabel: `Collect from ${fallback.name || fallback.areaName || 'Sidcup'}`,
    priceMinor: minor(fallback.collectionFeeMinor || 0),
    rawLocation: fallback,
    locationId: text(fallback.id),
    locationSlug: text(fallback.slug),
    locationName: text(fallback.name || fallback.areaName),
    locationType: text(fallback.type || fallback.kind),
    collectionTruth: text(fallback.collectionTruth || fallback.locationTruthRule || 'Collection details must be confirmed before travel.'),
    pickupInstructions: text(fallback.pickupInstructions || fallback.collectionInstructions || 'Wait for ready-to-collect confirmation before travelling.'),
    cutoffTime: text(fallback.cutoffTime || ''),
    googleBusinessEligible: Boolean(fallback.googleBusinessEligible),
  };
}

async function firstCheckoutLocation(request: Request) {
  try {
    const data = await listFulfilmentLocations(request, { status: 'active', publicOnly: true, checkoutOnly: true });
    return data.items?.[0] || null;
  } catch {
    return null;
  }
}

async function buildScenarioItems(request: Request, scenario: 'mixed-vat' | 'standard-vat') {
  if (scenario === 'mixed-vat') {
    const item = await buildCartItem(request, {
      id: 'e2e-a5-leaflets-design',
      productSlug: 'a5-leaflets',
      productName: 'A5 Leaflets',
      quantity: 250,
      selections: { size: 'A5', sides: 'double-sided', paper: '130gsm silk', quantity: 250 },
      turnaround: '3 working days',
      vatClass: 'zero',
      priceFromMinor: 2900,
      artwork: { required: false, status: 'artwork-later' },
      addOns: [{ id: 'design-service', name: 'Design service', quantity: 1, unitNetMinor: 1500, vatClass: 'standard', pricingSource: 'add-on' }],
    });
    return [item];
  }
  const item = await buildCartItem(request, {
    id: 'e2e-business-cards-standard',
    productSlug: 'standard-business-cards',
    productName: 'Business Cards',
    quantity: 500,
    selections: { size: '85x55mm', sides: 'double-sided', stock: '450gsm silk', quantity: 500 },
    turnaround: '3 working days',
    vatClass: 'standard',
    priceFromMinor: 1900,
    artwork: { required: false, status: 'artwork-later' },
  });
  return [item];
}

function buildPayload(params: { scenarioId: string; items: Array<Record<string, any>>; fulfilment: Record<string, any>; mode: ScenarioMode }) {
  const totals = summarizeCart(params.items);
  const paymentDecision = decideCheckoutPayment({
    items: params.items,
    totals,
    paymentMethod: 'quote-request',
    quoteRequired: true,
    manualReview: true,
  });
  const quoteReference = `E2E-${params.scenarioId.toUpperCase()}-${Date.now()}`;
  return {
    id: makeId('e2e-checkout-order'),
    quoteReference,
    orderNumber: quoteReference,
    testMode: true,
    clearCart: false,
    source: 'Build53StorefrontE2ETest',
    customer: checkoutCustomer(),
    customerName: checkoutCustomer().name,
    customerEmail: checkoutCustomer().email,
    customerPhone: checkoutCustomer().phone,
    customerCompany: checkoutCustomer().company,
    items: params.items,
    totals,
    vatBreakdown: totals.vatBreakdown,
    fulfilmentSelection: params.fulfilment,
    delivery: params.fulfilment,
    fulfilmentMode: params.fulfilment.fulfilmentMode || params.fulfilment.type || 'collection',
    fulfilmentChoice: params.fulfilment.value || params.fulfilment.id,
    shippingMethod: params.fulfilment.label || params.fulfilment.publicLabel || 'Collection',
    shippingMinor: minor(params.fulfilment.priceMinor),
    deliveryEstimate: estimateDelivery(params.items[0]?.turnaround),
    artworkMode: 'later',
    artwork_mode: 'later',
    paymentMethod: 'quote-request',
    quoteRequired: true,
    manualReview: true,
    paymentDecision,
    internalNotes: [
      'Created by Build 53 storefront end-to-end launch test.',
      `Scenario: ${params.scenarioId}.`,
      `Mode: ${params.mode}.`,
    ],
  };
}

function validateScenario(params: { scenarioId: string; items: Array<Record<string, any>>; totals: Record<string, any>; fulfilment: Record<string, any>; paymentDecision: Record<string, any> }) {
  const steps: StorefrontE2eStep[] = [];
  const { scenarioId, items, totals, fulfilment, paymentDecision } = params;
  try { validateCartSnapshot(items); steps.push(pass('cart-integrity', 'Cart integrity', 'Cart item totals reconcile and VAT rates match the line values.')); } catch (error) { steps.push(fail('cart-integrity', 'Cart integrity', error instanceof Error ? error.message : 'Cart integrity failed.', 'Fix product pricing/VAT calculation before launch.')); }
  try { validateCheckoutReadiness(items); steps.push(pass('checkout-readiness', 'Checkout readiness', 'Checkout readiness passes.')); } catch (error) {
    const isArtworkLater = error instanceof StorefrontHttpError && ['ARTWORK_REQUIRED', 'PREFLIGHT_REQUIRED'].includes(error.code);
    steps.push(isArtworkLater ? warn('checkout-readiness', 'Checkout readiness', 'Checkout requires artwork/preflight, but this launch scenario uses artwork later/manual review.', 'Confirm artwork-later checkout wording is clear.') : fail('checkout-readiness', 'Checkout readiness', error instanceof Error ? error.message : 'Checkout readiness failed.', 'Fix checkout validation before launch.'));
  }
  const rates = vatRates(items);
  if (scenarioId === 'mixed-vat') {
    if (rates.includes(0) && rates.includes(20)) steps.push(pass('mixed-vat', 'Mixed VAT', 'Zero-rated base product and standard-rated add-on are both present.'));
    else steps.push(fail('mixed-vat', 'Mixed VAT', `Expected VAT rates 0 and 20, got: ${rates.join(', ') || 'none'}.`, 'Fix product/add-on VAT classification.'));
  } else if (rates.includes(20)) steps.push(pass('standard-vat', 'Standard VAT', 'Standard-rated product line is present.'));
  else steps.push(fail('standard-vat', 'Standard VAT', `Expected standard VAT rate 20, got: ${rates.join(', ') || 'none'}.`, 'Fix product VAT classification.'));

  const expectedGross = items.reduce((sum, item) => sum + minor(item.grossTotalMinor) + (Array.isArray(item.addOns) ? item.addOns.reduce((addSum: number, addOn: Record<string, any>) => addSum + minor(addOn.grossTotalMinor), 0) : 0), 0);
  if (minor(totals.grossTotalMinor) === expectedGross) steps.push(pass('cart-total', 'Cart total', `Gross total reconciles at ${totals.currency || 'GBP'} ${minor(totals.grossTotalMinor) / 100}.`));
  else steps.push(fail('cart-total', 'Cart total', `Expected gross ${expectedGross}, got ${totals.grossTotalMinor}.`, 'Fix cart summary reconciliation.'));

  if (fulfilment?.fulfilmentMode === 'collection' || fulfilment?.type === 'collection') steps.push(pass('fulfilment', 'Collection fulfilment', `Selected collection option: ${fulfilment.label || fulfilment.publicLabel}.`));
  else steps.push(warn('fulfilment', 'Collection fulfilment', 'No collection option was available, fallback was used.', 'Activate at least one checkout-enabled collection location.'));

  if (paymentDecision?.requiresApproval || paymentDecision?.mode?.includes('approval')) steps.push(pass('payment-decision', 'Payment decision', 'Manual review / quote request route is active for the test payload.'));
  else steps.push(warn('payment-decision', 'Payment decision', 'Payment decision did not require approval for the test payload.', 'Check payment rules if test orders should avoid real Stripe payment.'));

  return steps;
}

function validatePersistedOrder(order: Record<string, any>, payload: Record<string, any>, scenarioId: string) {
  const steps: StorefrontE2eStep[] = [];
  if (minor(order.totalMinor) === minor(payload.totals?.grossTotalMinor)) steps.push(pass('persisted-total', 'Persisted order total', 'Saved order gross total matches the checkout payload total.'));
  else steps.push(fail('persisted-total', 'Persisted order total', `Saved total ${order.totalMinor} does not match checkout payload ${payload.totals?.grossTotalMinor}.`, 'Fix order VAT/totals persistence before launch.'));
  if (scenarioId === 'mixed-vat') {
    const hasAddOn = Array.isArray(order.items) && order.items.some((item: Record<string, any>) => item.lineType === 'add-on' || item.metadataJson?.lineType === 'add-on');
    if (hasAddOn) steps.push(pass('persisted-add-on', 'Persisted add-on line', 'Design/service add-on was saved as its own VAT-enforced order line.'));
    else steps.push(fail('persisted-add-on', 'Persisted add-on line', 'Mixed VAT scenario did not save an add-on order line.', 'Add-ons must be preserved as VAT-rated lines.'));
  }
  return steps;
}

async function runScenario(request: Request, scenarioId: 'mixed-vat' | 'standard-vat', mode: ScenarioMode): Promise<ScenarioResult> {
  const items = await buildScenarioItems(request, scenarioId);
  const location = await firstCheckoutLocation(request);
  const fulfilment = collectionFulfilment(location);
  const payload = buildPayload({ scenarioId, items, fulfilment, mode });
  const steps = validateScenario({ scenarioId, items, totals: payload.totals, fulfilment, paymentDecision: payload.paymentDecision });
  let order: Record<string, any> | undefined;
  if (mode === 'create-test-order' && !steps.some((step) => step.severity === 'error')) {
    order = await saveOrder(request, {
      ...payload,
      status: 'AWAITING_APPROVAL',
      paymentStatus: 'test_unpaid',
      paymentProvider: 'test-manual-review',
      notes: 'Build 53 storefront end-to-end launch test order. Safe to cancel/delete after QA.',
    }) as Record<string, any>;
    steps.push(pass('order-created', 'Order created', `Test order was created: ${order.orderNumber || order.id}.`, 'Open Orders and verify the order payload, VAT, fulfilment and customer details.'));
    steps.push(...validatePersistedOrder(order, payload, scenarioId));
  } else if (mode === 'dry-run') {
    steps.push(info('dry-run', 'Dry run only', 'No order was written. Use create-test-order mode when you want to verify persistence in Orders.', 'Run create-test-order after reviewing dry-run output.'));
  }
  const ready = !steps.some((step) => step.severity === 'error');
  return { id: scenarioId, label: scenarioId === 'mixed-vat' ? 'Mixed VAT leaflet + design add-on' : 'Standard VAT business cards', mode, steps, items, totals: payload.totals, payload, order, paymentDecision: payload.paymentDecision, fulfilment, ready };
}

export async function runStorefrontOrderE2e(request: Request, options: { mode?: ScenarioMode; scenario?: 'all' | 'mixed-vat' | 'standard-vat' } = {}) {
  const mode = options.mode === 'create-test-order' ? 'create-test-order' : 'dry-run';
  const scenario = options.scenario || 'all';
  const scenarioIds = scenario === 'all' ? ['mixed-vat', 'standard-vat'] as const : [scenario] as const;
  const scenarios = [] as ScenarioResult[];
  for (const scenarioId of scenarioIds) scenarios.push(await runScenario(request, scenarioId, mode));
  const steps = scenarios.flatMap((item) => item.steps);
  const errors = steps.filter((step) => step.severity === 'error').length;
  const warnings = steps.filter((step) => step.severity === 'warning').length;
  const passes = steps.filter((step) => step.severity === 'pass').length;
  const infoCount = steps.filter((step) => step.severity === 'info').length;
  const score = Math.max(0, Math.min(100, 100 - errors * 25 - warnings * 8));
  return {
    mode,
    scenario,
    ready: errors === 0,
    score,
    generatedAt: new Date().toISOString(),
    summary: { scenarios: scenarios.length, steps: steps.length, pass: passes, warning: warnings, error: errors, info: infoCount, testOrdersCreated: scenarios.filter((item) => item.order).length },
    scenarios,
    nextActions: steps.filter((step) => step.severity === 'error' || step.severity === 'warning').map((step) => ({ label: step.label, detail: step.detail, action: step.action, severity: step.severity })),
  };
}
