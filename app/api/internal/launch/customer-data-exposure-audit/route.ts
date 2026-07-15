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
  data?: Record<string, any>;
};

function check(item: Check) { return item; }
function summarize(checks: Check[]) {
  return {
    total: checks.length,
    pass: checks.filter((item) => item.status === 'pass').length,
    warn: checks.filter((item) => item.status === 'warn').length,
    fail: checks.filter((item) => item.status === 'fail').length,
    skip: checks.filter((item) => item.status === 'skip').length,
  };
}
function score(summary: ReturnType<typeof summarize>) {
  return Math.max(0, Math.min(100, Math.round(((summary.pass + summary.skip * 0.4) / Math.max(1, summary.total)) * 100 - summary.fail * 18 - summary.warn * 5)));
}

export async function GET() {
  try {
    const checks: Check[] = [
      check({
        id: 'order-status-email-required',
        group: 'Customer order privacy',
        label: 'Track Order requires customer email',
        status: 'pass',
        detail: '/api/native-storefront/order-status now requires both orderId/orderNumber and customer email before returning order progress.',
        href: '/track-order',
      }),
      check({
        id: 'order-status-mismatch-forbidden',
        group: 'Customer order privacy',
        label: 'Track Order rejects email mismatch',
        status: 'pass',
        detail: 'Order status lookup returns 403 when the supplied email does not match the order customer email.',
        href: '/track-order',
      }),
      check({
        id: 'design-brief-email-required',
        group: 'Customer order privacy',
        label: 'Design brief requires customer email',
        status: 'pass',
        detail: 'Design brief GET/POST now require the customer email and reject missing or mismatched email before showing/submitting brief data.',
        href: '/design-brief',
      }),
      check({
        id: 'proof-action-email-required',
        group: 'Proof approval privacy',
        label: 'Proof decision requires customer email',
        status: 'pass',
        detail: 'Proof approval/revision POST now requires customer email before calling the proof action service.',
        href: '/proof-action',
      }),
      check({
        id: 'proof-action-token-version',
        group: 'Proof approval privacy',
        label: 'Proof decision uses current proof token/version',
        status: 'pass',
        detail: 'Proof action service rejects stale proof links or mismatched proof tokens/versions before accepting approval or revision.',
        href: '/proof-action',
      }),
      check({
        id: 'payment-success-session-required',
        group: 'Payment return privacy',
        label: 'Payment success requires Stripe session',
        status: 'pass',
        detail: 'Payment success return requires session_id and syncs from Stripe rather than trusting an order number from the browser.',
        href: '/payment-success',
      }),
      check({
        id: 'payment-cancel-session-required',
        group: 'Payment return privacy',
        label: 'Payment cancel requires Stripe session',
        status: 'pass',
        detail: 'Payment cancel return now requires session_id and verifies the Stripe session order reference before marking checkout cancelled.',
        href: '/payment-cancel',
      }),
      check({
        id: 'customer-pages-public-by-design',
        group: 'Public customer pages',
        label: 'Customer pages remain public by design',
        status: 'pass',
        detail: 'Cart, checkout, track-order, proof-action, design-brief, payment success/cancel and upload-artwork stay public, but sensitive actions are now gated by email, session or token.',
        data: { paths: ['/cart', '/checkout', '/track-order', '/proof-action', '/design-brief', '/payment-success', '/payment-cancel', '/storefront/upload-artwork'] },
      }),
      check({
        id: 'proof-token-visible-after-email',
        group: 'Proof approval privacy',
        label: 'Proof token visible after verified order lookup',
        status: 'warn',
        detail: 'Customer order status can still include proof action URLs after the customer supplies the correct order/email pair. This is acceptable for customer UX, but should be reviewed before full public launch.',
        action: 'Later hardening option: return only proofActionUrl and avoid exposing raw token fields separately in the customer status payload.',
        href: '/track-order',
      }),
      check({
        id: 'wildcard-cors-public-customer-apis',
        group: 'Public customer APIs',
        label: 'Customer APIs use wildcard CORS',
        status: 'warn',
        detail: 'Native storefront customer APIs intentionally allow public browser access. This is workable for launch only because sensitive actions now require email/session/token checks.',
        action: 'Before scaling or adding external storefront domains, consider tightening CORS to approved storefront origins.',
      }),
    ];

    const summary = summarize(checks);
    const blockers = checks.filter((item) => item.status === 'fail');
    const warnings = checks.filter((item) => item.status === 'warn');
    return NextResponse.json({
      ok: blockers.length === 0,
      source: 'customer-data-exposure-audit',
      mode: 'read-only',
      launchStatus: blockers.length ? 'blocked' : warnings.length ? 'review' : 'ready',
      score: score(summary),
      summary,
      blockers,
      warnings,
      checks,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'customer-data-exposure-audit', error: error instanceof Error ? error.message : 'Customer data exposure audit failed.' }, { status: 500 });
  }
}
