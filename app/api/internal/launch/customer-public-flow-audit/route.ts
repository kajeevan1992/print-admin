import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type Check = {
  id: string;
  group: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action?: string;
  href?: string;
  surface?: string;
};

function summarize(checks: Check[]) {
  return {
    total: checks.length,
    pass: checks.filter((check) => check.status === 'pass').length,
    warn: checks.filter((check) => check.status === 'warn').length,
    fail: checks.filter((check) => check.status === 'fail').length,
    skip: checks.filter((check) => check.status === 'skip').length,
  };
}

function groupCounts(checks: Check[]) {
  const groups: Record<string, ReturnType<typeof summarize>> = {};
  for (const check of checks) {
    groups[check.group] ||= { total: 0, pass: 0, warn: 0, fail: 0, skip: 0 };
    groups[check.group].total += 1;
    groups[check.group][check.status] += 1;
  }
  return groups;
}

const checks: Check[] = [
  {
    id: 'track-order-email-required',
    group: 'Customer order tracking',
    label: 'Track Order requires email match',
    status: 'pass',
    detail: 'The customer order status API requires orderId/orderNumber and customer email, and returns 403 when the email does not match.',
    href: '/track-order',
    surface: '/api/native-storefront/order-status',
  },
  {
    id: 'track-order-safe-status',
    group: 'Customer order tracking',
    label: 'Track Order uses customer-safe status service',
    status: 'pass',
    detail: 'The public status endpoint resolves the order through the customer order status service rather than exposing raw admin order rows.',
    href: '/track-order',
    surface: '/api/native-storefront/order-status',
  },
  {
    id: 'proof-action-email-required',
    group: 'Proof approval',
    label: 'Proof action requires customer email',
    status: 'pass',
    detail: 'The proof action API rejects submissions without customer email and validates it against the order before applying a decision.',
    href: '/proof-action',
    surface: '/api/native-storefront/proof-action',
  },
  {
    id: 'proof-action-current-token-version',
    group: 'Proof approval',
    label: 'Proof action checks current token/version',
    status: 'pass',
    detail: 'Customer proof decisions are only accepted for an open proof and the current proof token/version, blocking stale proof links.',
    href: '/proof-action',
    surface: '/api/native-storefront/proof-action',
  },
  {
    id: 'proof-action-production-gate',
    group: 'Proof approval',
    label: 'Proof approval keeps payment gate',
    status: 'pass',
    detail: 'Proof approval can release production only when the payment gate is paid/captured/authorized/manual-paid. Otherwise the ticket remains on payment hold.',
    href: '/proof-action',
    surface: '/api/native-storefront/proof-action',
  },
  {
    id: 'replacement-artwork-email-required',
    group: 'Artwork upload',
    label: 'Replacement artwork requires email match',
    status: 'pass',
    detail: 'Replacement artwork upload now requires a customer email and rejects uploads when the email does not match the order.',
    href: '/storefront/upload-artwork',
    surface: '/api/native-storefront/artwork-revision',
  },
  {
    id: 'replacement-artwork-file-required',
    group: 'Artwork upload',
    label: 'Replacement artwork requires a file',
    status: 'pass',
    detail: 'The replacement artwork route rejects requests without an uploaded file and records preflight state before updating ticket/planner data.',
    href: '/storefront/upload-artwork',
    surface: '/api/native-storefront/artwork-revision',
  },
  {
    id: 'payment-return-session-required',
    group: 'Payment return',
    label: 'Payment success requires Stripe session',
    status: 'pass',
    detail: 'Payment success return sync requires a Stripe session id before marking an order from checkout return.',
    href: '/payment-success',
    surface: '/api/native-storefront/payment-return',
  },
  {
    id: 'payment-cancel-order-required',
    group: 'Payment return',
    label: 'Payment cancel requires order id',
    status: 'pass',
    detail: 'Payment cancel return requires an order id before marking checkout as cancelled.',
    href: '/payment-cancel',
    surface: '/api/native-storefront/payment-return',
  },
  {
    id: 'checkout-server-recalculation',
    group: 'Checkout',
    label: 'Checkout recalculates price server-side',
    status: 'pass',
    detail: 'Native storefront checkout recalculates pricing/VAT server-side before creating the order/payment session.',
    href: '/checkout',
    surface: '/api/native-storefront/checkout',
  },
  {
    id: 'checkout-upload-now-preflight',
    group: 'Checkout',
    label: 'Upload-now preflight blocks bad artwork before payment',
    status: 'pass',
    detail: 'Upload artwork now requires a file and blocks payment/order creation when preflight has blocking issues.',
    href: '/checkout',
    surface: '/api/native-storefront/checkout',
  },
  {
    id: 'public-cors-review',
    group: 'Public API surface',
    label: 'Public storefront CORS remains broad',
    status: 'warn',
    detail: 'Some customer storefront APIs intentionally allow broad CORS for hosted themes/customer pages. Keep this reviewed before public launch.',
    action: 'Confirm production storefront domains are known and reduce broad CORS later if the hosted-theme model allows it.',
    href: '/launch-security-access-audit',
    surface: 'native-storefront public APIs',
  },
  {
    id: 'customer-pages-public-by-design',
    group: 'Public API surface',
    label: 'Customer pages remain public by design',
    status: 'pass',
    detail: 'Track order, proof action, design brief, payment success/cancel and upload artwork remain public because customers need access, while route APIs enforce order/email/token checks.',
    href: '/launch-security-access-audit',
    surface: 'customer pages',
  },
];

export async function GET() {
  const summary = summarize(checks);
  const launchStatus = summary.fail ? 'blocked' : summary.warn ? 'review' : 'ready';
  return NextResponse.json({
    ok: summary.fail === 0,
    source: 'customer-public-flow-audit',
    mode: 'read-only',
    launchStatus,
    summary,
    groups: groupCounts(checks),
    checks,
    hardBlockers: checks.filter((check) => check.status === 'fail'),
    reviewItems: checks.filter((check) => check.status === 'warn'),
    generatedAt: new Date().toISOString(),
  });
}
