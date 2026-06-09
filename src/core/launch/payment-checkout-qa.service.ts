import { buildCartItem, estimateDelivery, summarizeCart } from '@/core/storefront/cart-checkout-bridge';
import { validateCartSnapshot } from '@/core/storefront/storefront-integrity';
import { canCreatePaymentSessionForOrder, decideCheckoutPayment } from '@/core/payments/payment-rules';
import { saveOrder } from '@/core/orders/orders.service';
import { runStorefrontOrderE2e } from './storefront-order-e2e.service';

export type PaymentCheckoutQaSeverity = 'pass' | 'warning' | 'error' | 'info';
export type PaymentCheckoutQaCheck = {
  id: string;
  category: 'stripe-config' | 'payment-rules' | 'checkout-totals' | 'order-payment' | 'e2e' | 'failure-handling';
  severity: PaymentCheckoutQaSeverity;
  label: string;
  detail: string;
  action?: string;
};

type QaMode = 'dry-run' | 'create-payment-test-order';

function pass(id: string, category: PaymentCheckoutQaCheck['category'], label: string, detail: string, action = ''): PaymentCheckoutQaCheck { return { id, category, severity: 'pass', label, detail, action }; }
function warn(id: string, category: PaymentCheckoutQaCheck['category'], label: string, detail: string, action = ''): PaymentCheckoutQaCheck { return { id, category, severity: 'warning', label, detail, action }; }
function fail(id: string, category: PaymentCheckoutQaCheck['category'], label: string, detail: string, action = ''): PaymentCheckoutQaCheck { return { id, category, severity: 'error', label, detail, action }; }
function info(id: string, category: PaymentCheckoutQaCheck['category'], label: string, detail: string, action = ''): PaymentCheckoutQaCheck { return { id, category, severity: 'info', label, detail, action }; }
function minor(value: unknown) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0; }
function masked(value: string) { if (!value) return ''; if (value.length <= 10) return `${value.slice(0, 3)}***`; return `${value.slice(0, 7)}…${value.slice(-4)}`; }
function env(name: string) { return String(process.env[name] || '').trim(); }
function isLiveKey(value: string) { return /^sk_live_|^pk_live_/.test(value); }
function isTestKey(value: string) { return /^sk_test_|^pk_test_/.test(value); }

function stripeConfigChecks() {
  const secret = env('STRIPE_SECRET_KEY');
  const publishable = env('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') || env('STRIPE_PUBLISHABLE_KEY');
  const webhook = env('STRIPE_WEBHOOK_SECRET');
  const checks: PaymentCheckoutQaCheck[] = [];
  if (secret) checks.push(pass('stripe-secret-present', 'stripe-config', 'Stripe secret key configured', `Secret key is present: ${masked(secret)}.`));
  else checks.push(warn('stripe-secret-missing', 'stripe-config', 'Stripe secret key missing', 'No STRIPE_SECRET_KEY was found in environment.', 'Add Stripe secret key before enabling live card payments.'));
  if (publishable) checks.push(pass('stripe-publishable-present', 'stripe-config', 'Stripe publishable key configured', `Publishable key is present: ${masked(publishable)}.`));
  else checks.push(warn('stripe-publishable-missing', 'stripe-config', 'Stripe publishable key missing', 'No NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY or STRIPE_PUBLISHABLE_KEY was found.', 'Add publishable key for storefront card checkout.'));
  if (webhook) checks.push(pass('stripe-webhook-present', 'stripe-config', 'Stripe webhook secret configured', `Webhook secret is present: ${masked(webhook)}.`));
  else checks.push(warn('stripe-webhook-missing', 'stripe-config', 'Stripe webhook secret missing', 'No STRIPE_WEBHOOK_SECRET was found.', 'Add webhook secret before launch so paid/failed events update orders.'));
  if (secret && publishable && ((isLiveKey(secret) && isTestKey(publishable)) || (isTestKey(secret) && isLiveKey(publishable)))) {
    checks.push(fail('stripe-key-mode-mismatch', 'stripe-config', 'Stripe key mode mismatch', 'Secret and publishable keys appear to use different test/live modes.', 'Use matching test keys for testing or matching live keys for launch.'));
  }
  if (isLiveKey(secret) || isLiveKey(publishable)) checks.push(warn('stripe-live-key-detected', 'stripe-config', 'Live Stripe key detected', 'Live key format detected in environment.', 'Only use live keys after final test order and webhook QA are complete.'));
  return { checks, config: { secretPresent: Boolean(secret), publishablePresent: Boolean(publishable), webhookPresent: Boolean(webhook), secretMode: isLiveKey(secret) ? 'live' : isTestKey(secret) ? 'test' : secret ? 'unknown' : 'missing', publishableMode: isLiveKey(publishable) ? 'live' : isTestKey(publishable) ? 'test' : publishable ? 'unknown' : 'missing' } };
}

function paymentRuleChecks() {
  const checks: PaymentCheckoutQaCheck[] = [];
  const payNow = decideCheckoutPayment({ paymentMethod: 'card', totals: { grossTotalMinor: 2500 } });
  const quote = decideCheckoutPayment({ paymentMethod: 'quote-request', quoteRequired: true });
  const blocked = decideCheckoutPayment({ checkoutBlocked: true });
  if (payNow.mode === 'pay-now' && payNow.canPayNow && !payNow.requiresApproval) checks.push(pass('pay-now-rule', 'payment-rules', 'Pay-now rule works', 'Card/online payment payload is routed to pay-now.'));
  else checks.push(fail('pay-now-rule', 'payment-rules', 'Pay-now rule failed', `Expected pay-now, got ${payNow.mode}.`, 'Fix payment-rules decideCheckoutPayment for card payments.'));
  if (quote.mode === 'quote-first' && quote.requiresApproval) checks.push(pass('quote-first-rule', 'payment-rules', 'Quote-first rule works', 'Quote/manual review payload is routed to quote-first.'));
  else checks.push(fail('quote-first-rule', 'payment-rules', 'Quote-first rule failed', `Expected quote-first, got ${quote.mode}.`, 'Fix quote/manual review payment rule.'));
  if (blocked.mode === 'blocked' && blocked.orderStatus === 'ARTWORK_CHECK') checks.push(pass('blocked-rule', 'payment-rules', 'Blocked checkout rule works', 'Blocked/artwork review payload is routed to ARTWORK_CHECK.'));
  else checks.push(fail('blocked-rule', 'payment-rules', 'Blocked checkout rule failed', `Expected blocked, got ${blocked.mode}.`, 'Fix blocked checkout payment rule.'));
  return checks;
}

function paymentSessionChecks() {
  const checks: PaymentCheckoutQaCheck[] = [];
  const ready = canCreatePaymentSessionForOrder({ status: 'APPROVED', paymentStatus: 'unpaid', totalMinor: 2500 });
  const awaitingApproval = canCreatePaymentSessionForOrder({ status: 'AWAITING_APPROVAL', paymentStatus: 'unpaid', totalMinor: 2500 });
  const paid = canCreatePaymentSessionForOrder({ status: 'APPROVED', paymentStatus: 'paid', totalMinor: 2500 });
  const zero = canCreatePaymentSessionForOrder({ status: 'APPROVED', paymentStatus: 'unpaid', totalMinor: 0 });
  const cancelled = canCreatePaymentSessionForOrder({ status: 'CANCELLED', paymentStatus: 'unpaid', totalMinor: 2500 });
  if (ready.ok) checks.push(pass('payment-session-ready', 'order-payment', 'Approved unpaid order can create payment session', ready.reason));
  else checks.push(fail('payment-session-ready', 'order-payment', 'Approved unpaid order cannot create payment session', ready.reason, 'Fix payment session eligibility before launch.'));
  if (!awaitingApproval.ok) checks.push(pass('payment-session-awaiting-approval-blocked', 'failure-handling', 'Awaiting approval cannot be paid yet', awaitingApproval.reason));
  else checks.push(fail('payment-session-awaiting-approval-blocked', 'failure-handling', 'Awaiting approval incorrectly allowed for payment', 'Quote-first orders must be approved before payment link creation.', 'Block payment until approval.'));
  if (!paid.ok) checks.push(pass('payment-session-paid-blocked', 'failure-handling', 'Paid order cannot be paid again', paid.reason));
  else checks.push(fail('payment-session-paid-blocked', 'failure-handling', 'Paid order incorrectly allowed for payment', 'Duplicate payment risk.', 'Block paid orders from new sessions.'));
  if (!zero.ok) checks.push(pass('payment-session-zero-blocked', 'failure-handling', 'Zero-total order cannot be paid', zero.reason));
  else checks.push(fail('payment-session-zero-blocked', 'failure-handling', 'Zero-total order incorrectly allowed', 'Zero totals should not create card sessions.', 'Block zero-total payments.'));
  if (!cancelled.ok) checks.push(pass('payment-session-cancelled-blocked', 'failure-handling', 'Cancelled order cannot be paid', cancelled.reason));
  else checks.push(fail('payment-session-cancelled-blocked', 'failure-handling', 'Cancelled order incorrectly allowed', 'Cancelled orders should not be payable.', 'Block cancelled orders.'));
  return checks;
}

async function checkoutTotalsChecks(request: Request) {
  const checks: PaymentCheckoutQaCheck[] = [];
  const item = await buildCartItem(request, {
    id: 'qa-standard-business-cards-delivery',
    productSlug: 'standard-business-cards',
    productName: 'Business Cards',
    quantity: 500,
    priceFromMinor: 1900,
    vatClass: 'standard',
    artwork: { required: false, status: 'artwork-later' },
  });
  const addOnItem = await buildCartItem(request, {
    id: 'qa-leaflets-design-payment',
    productSlug: 'a5-leaflets',
    productName: 'A5 Leaflets',
    quantity: 250,
    priceFromMinor: 2900,
    vatClass: 'zero',
    artwork: { required: false, status: 'artwork-later' },
    addOns: [{ id: 'design-service', name: 'Design service', quantity: 1, unitNetMinor: 1500, vatClass: 'standard' }],
  });
  try { validateCartSnapshot([item, addOnItem]); checks.push(pass('checkout-cart-snapshot', 'checkout-totals', 'Checkout cart snapshot validates', 'Standard VAT product and mixed VAT add-on cart lines reconcile.')); }
  catch (error) { checks.push(fail('checkout-cart-snapshot', 'checkout-totals', 'Checkout cart snapshot failed', error instanceof Error ? error.message : 'Cart validation failed.', 'Fix checkout cart totals before launch.')); }
  const totals = summarizeCart([item, addOnItem]);
  const rates = new Set((totals.vatBreakdown || []).map((row: Record<string, any>) => Number(row.vatRate)));
  if (rates.has(0) && rates.has(20)) checks.push(pass('checkout-vat-breakdown', 'checkout-totals', 'Checkout VAT breakdown supports mixed rates', 'VAT breakdown includes both 0% and 20% rates.'));
  else checks.push(fail('checkout-vat-breakdown', 'checkout-totals', 'Checkout VAT breakdown missing mixed rates', `Rates found: ${[...rates].join(', ') || 'none'}.`, 'Fix VAT breakdown before taking mixed VAT orders.'));
  const deliveryGross = 600;
  const expectedPaymentTotal = minor(totals.grossTotalMinor) + deliveryGross;
  if (expectedPaymentTotal > minor(totals.grossTotalMinor)) checks.push(pass('checkout-delivery-total', 'checkout-totals', 'Delivery fee can be added to checkout total', `Cart gross ${totals.grossTotalMinor}; with delivery ${expectedPaymentTotal}.`));
  else checks.push(fail('checkout-delivery-total', 'checkout-totals', 'Delivery fee total failed', 'Delivery fee did not increase total.', 'Fix delivery fee handling.'));
  return { checks, totals: { ...totals, deliveryGrossMinor: deliveryGross, paymentGrossWithDeliveryMinor: expectedPaymentTotal } };
}

async function createPaymentReadyTestOrder(request: Request) {
  const item = await buildCartItem(request, {
    id: 'qa-payment-ready-business-cards',
    productSlug: 'standard-business-cards',
    productName: 'Business Cards',
    quantity: 500,
    priceFromMinor: 1900,
    vatClass: 'standard',
    artwork: { required: false, status: 'artwork-later' },
  });
  const totals = summarizeCart([item]);
  const orderNumber = `PAYQA-${Date.now()}`;
  const order = await saveOrder(request, {
    id: `payqa-${Date.now()}`,
    orderNumber,
    quoteReference: orderNumber,
    source: 'Build54PaymentCheckoutQA',
    customer: { name: 'Payment QA Customer', email: 'payment-qa@holoprint.co.uk', phone: '020 3336 0322', company: 'Holo Print QA' },
    customerName: 'Payment QA Customer',
    customerEmail: 'payment-qa@holoprint.co.uk',
    customerPhone: '020 3336 0322',
    customerCompany: 'Holo Print QA',
    items: [item],
    totals,
    status: 'APPROVED',
    paymentStatus: 'test_unpaid',
    paymentProvider: 'test-manual-review',
    notes: 'Build 54 payment-ready test order. Safe to cancel/delete after QA.',
    internalNotes: ['Created by Build 54 Payment + Checkout Final QA.', 'Use this order to test payment-link/session eligibility only.'],
  }) as Record<string, any>;
  const eligibility = canCreatePaymentSessionForOrder(order);
  return { order, eligibility };
}

export async function buildPaymentCheckoutQa(request: Request, options: { mode?: QaMode } = {}) {
  const mode = options.mode === 'create-payment-test-order' ? 'create-payment-test-order' : 'dry-run';
  const stripe = stripeConfigChecks();
  const ruleChecks = paymentRuleChecks();
  const sessionChecks = paymentSessionChecks();
  const totals = await checkoutTotalsChecks(request);
  const e2e = await runStorefrontOrderE2e(request, { mode: 'dry-run', scenario: 'all' });
  const checks: PaymentCheckoutQaCheck[] = [...stripe.checks, ...ruleChecks, ...sessionChecks, ...totals.checks];
  if (e2e.ready) checks.push(pass('storefront-e2e-ready', 'e2e', 'Storefront order E2E dry-run is ready', `Build 53 E2E score ${e2e.score}/100.`));
  else checks.push(fail('storefront-e2e-ready', 'e2e', 'Storefront order E2E has errors', `Build 53 E2E score ${e2e.score}/100.`, 'Open Storefront Order Test and fix failing steps.'));
  let paymentReadyTestOrder: Record<string, any> | null = null;
  if (mode === 'create-payment-test-order' && !checks.some((item) => item.severity === 'error')) {
    const created = await createPaymentReadyTestOrder(request);
    paymentReadyTestOrder = created.order;
    if (created.eligibility.ok) checks.push(pass('payment-ready-test-order', 'order-payment', 'Payment-ready test order created', `Created ${created.order.orderNumber || created.order.id}; payment eligibility passed.`));
    else checks.push(fail('payment-ready-test-order', 'order-payment', 'Payment-ready test order is not eligible', created.eligibility.reason, 'Fix order payment eligibility before launch.'));
  } else if (mode === 'dry-run') {
    checks.push(info('payment-test-order-dry-run', 'order-payment', 'Dry run only', 'No payment-ready test order was created.', 'Use create-payment-test-order after dry-run passes.'));
  }
  const errors = checks.filter((item) => item.severity === 'error').length;
  const warnings = checks.filter((item) => item.severity === 'warning').length;
  const passCount = checks.filter((item) => item.severity === 'pass').length;
  const infoCount = checks.filter((item) => item.severity === 'info').length;
  const score = Math.max(0, Math.min(100, 100 - errors * 25 - warnings * 8));
  return {
    mode,
    ready: errors === 0,
    score,
    generatedAt: new Date().toISOString(),
    summary: { checks: checks.length, pass: passCount, warning: warnings, error: errors, info: infoCount },
    stripe: stripe.config,
    checkoutTotals: totals.totals,
    e2eSummary: e2e.summary,
    paymentReadyTestOrder,
    checks,
    nextActions: checks.filter((item) => item.severity === 'error' || item.severity === 'warning').map((item) => ({ label: item.label, detail: item.detail, action: item.action, severity: item.severity, category: item.category })),
  };
}
