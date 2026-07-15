import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type AuditStatus = 'pass' | 'warn' | 'fail';
type AuditCheck = {
  id: string;
  group: string;
  label: string;
  status: AuditStatus;
  detail: string;
  action?: string;
  href?: string;
  data?: Record<string, any>;
};

const protectedPrefixes = [
  '/',
  '/workspace',
  '/super-admin',
  '/products',
  '/categories',
  '/orders',
  '/settings',
  '/tenant-control',
  '/shop-login-setup',
  '/memberships',
  '/fresh-db-setup',
  '/admin-users',
  '/api-keys',
  '/credentials',
  '/security-events',
  '/oauth',
  '/database-manager',
  '/launch',
  '/first-live-order-monitor',
  '/post-launch-health',
  '/live-environment-readiness',
  '/final-launch-blockers',
  '/production-smoke-test',
  '/storefront-content-readiness',
  '/artwork-preflight',
  '/artwork-uploads',
  '/artwork-proofing',
  '/design-briefs',
  '/production-planner',
  '/dispatch-center',
  '/email-outbox',
  '/email-order-notification-qa',
  '/payment-checkout-qa',
  '/live-flow-check',
  '/admin-launch-security',
  '/button-audit',
  '/data-continuity',
  '/final-check',
];

const publicPagePrefixes = ['/login', '/logout', '/accept-invite', '/theme', '/storefront', '/product', '/category', '/cart', '/checkout', '/track-order', '/proof-action', '/design-brief', '/payment-success', '/payment-cancel'];
const publicInternalPrefixes = ['/api/internal/auth/', '/api/internal/storefront/', '/api/internal/catalog/', '/api/internal/seo/', '/api/internal/config/'];

const adminSurfaces = [
  '/launch-command-centre',
  '/launch-security-access-audit',
  '/live-environment-readiness',
  '/first-live-order-monitor',
  '/post-launch-health',
  '/launch-signoff',
  '/final-launch-blockers',
  '/production-smoke-test',
  '/storefront-content-readiness',
  '/launch-design-proof-readiness',
  '/launch-test-order',
  '/launch-test-data-cleanup',
  '/artwork-preflight',
  '/artwork-uploads',
  '/artwork-proofing',
  '/design-briefs',
  '/orders',
  '/production-planner',
  '/dispatch-center',
  '/email-outbox',
  '/settings',
  '/api-keys',
  '/credentials',
  '/database-manager',
];

const publicCustomerSurfaces = [
  '/login',
  '/theme/atlantis',
  '/product/business-cards',
  '/category/printing',
  '/cart',
  '/checkout',
  '/storefront/upload-artwork',
  '/track-order',
  '/proof-action',
  '/design-brief',
  '/payment-success',
  '/payment-cancel',
];

const internalAdminApis = [
  '/api/internal/launch/final-blockers',
  '/api/internal/launch/security-access-audit',
  '/api/internal/launch/live-environment-readiness',
  '/api/internal/launch/first-live-order-monitor',
  '/api/internal/launch/post-launch-health',
  '/api/internal/design-briefs',
  '/api/internal/payments/stripe/status',
  '/api/internal/email/status',
  '/api/internal/dispatch/shipments',
];

const customerAllowedApis = [
  '/api/internal/storefront/product',
  '/api/internal/storefront/price',
  '/api/internal/catalog/products',
  '/api/internal/seo/resolve',
  '/api/internal/config/public',
];

function isPublicPage(pathname: string) {
  return publicPagePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isProtectedPage(pathname: string) {
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) return false;
  if (isPublicPage(pathname)) return false;
  return protectedPrefixes.some((prefix) => prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicInternalApi(pathname: string) {
  return publicInternalPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function statusForMissing(missing: string[]): AuditStatus {
  return missing.length ? 'fail' : 'pass';
}

function summarize(checks: AuditCheck[]) {
  return {
    total: checks.length,
    pass: checks.filter((check) => check.status === 'pass').length,
    warn: checks.filter((check) => check.status === 'warn').length,
    fail: checks.filter((check) => check.status === 'fail').length,
  };
}

function groupCounts(checks: AuditCheck[]) {
  const groups: Record<string, ReturnType<typeof summarize>> = {};
  for (const check of checks) {
    groups[check.group] ||= { total: 0, pass: 0, warn: 0, fail: 0 };
    groups[check.group].total += 1;
    groups[check.group][check.status] += 1;
  }
  return groups;
}

export async function GET() {
  try {
    const checks: AuditCheck[] = [];
    const unprotectedAdminPages = adminSurfaces.filter((path) => !isProtectedPage(path));
    const accidentallyProtectedCustomerPages = publicCustomerSurfaces.filter((path) => isProtectedPage(path));
    const exposedAdminApis = internalAdminApis.filter((path) => isPublicInternalApi(path));
    const blockedCustomerApis = customerAllowedApis.filter((path) => !isPublicInternalApi(path));

    checks.push({
      id: 'admin-pages-protected',
      group: 'Admin page access',
      label: 'Admin and launch pages require admin session',
      status: statusForMissing(unprotectedAdminPages),
      detail: unprotectedAdminPages.length ? `${unprotectedAdminPages.length} admin pages are not covered by protected middleware prefixes.` : 'Launch, order, production, dispatch, email and settings pages are covered by protected middleware prefixes.',
      action: unprotectedAdminPages.length ? 'Add missing admin pages to middleware protected prefixes before public launch.' : 'No action needed unless you add new admin pages.',
      href: '/launch-security-access-audit',
      data: { unprotectedAdminPages, protectedPrefixes },
    });

    checks.push({
      id: 'customer-pages-public',
      group: 'Public customer access',
      label: 'Customer storefront and self-service pages remain public',
      status: accidentallyProtectedCustomerPages.length ? 'fail' : 'pass',
      detail: accidentallyProtectedCustomerPages.length ? `${accidentallyProtectedCustomerPages.length} customer pages appear protected and may break checkout/tracking.` : 'Storefront, cart, checkout, order tracking, proof review and customer design brief pages are public by design.',
      action: accidentallyProtectedCustomerPages.length ? 'Move customer paths into the public middleware prefixes.' : 'Keep customer pages public, but validate customer identity/token inside each flow.',
      data: { accidentallyProtectedCustomerPages, publicCustomerSurfaces },
    });

    checks.push({
      id: 'internal-admin-api-guard',
      group: 'Internal API access',
      label: 'Admin internal APIs are not on the public allow-list',
      status: exposedAdminApis.length ? 'fail' : 'pass',
      detail: exposedAdminApis.length ? `${exposedAdminApis.length} admin internal APIs are exposed through public internal prefixes.` : 'Launch, design brief, payment status, email status and dispatch internal APIs require admin session by middleware.',
      action: exposedAdminApis.length ? 'Remove these APIs from public internal prefixes or add route-level auth.' : 'No action needed for current internal admin APIs.',
      data: { exposedAdminApis, internalAdminApis },
    });

    checks.push({
      id: 'customer-api-allow-list',
      group: 'Customer API access',
      label: 'Storefront APIs required by public themes are allowed',
      status: blockedCustomerApis.length ? 'fail' : 'pass',
      detail: blockedCustomerApis.length ? `${blockedCustomerApis.length} storefront APIs are blocked and may break public storefront pricing/catalog.` : 'Public storefront/catalog/SEO/config APIs remain available for customer storefront rendering.',
      action: blockedCustomerApis.length ? 'Add required storefront APIs to public internal prefixes or move them to public customer API routes.' : 'Review CORS origins before public launch.',
      data: { blockedCustomerApis, customerAllowedApis, publicInternalPrefixes },
    });

    checks.push({
      id: 'cors-origin-review',
      group: 'CORS and storefront domains',
      label: 'Storefront CORS origins need production review',
      status: 'warn',
      detail: 'Middleware allows configured storefront origins and a few development/default origins. Before public launch, confirm CORS_ORIGIN/CORS_ORIGINS/STOREFRONT_URL only include intended domains.',
      action: 'Review Vercel environment variables and remove old preview/IP origins if they are no longer needed.',
      href: '/credentials',
    });

    checks.push({
      id: 'proof-token-public-flow',
      group: 'Customer token flows',
      label: 'Proof review remains public but must be token/version protected',
      status: 'pass',
      detail: 'The proof review page is intentionally public for customers. It should continue to rely on order/email/proof token/proof version validation rather than admin login.',
      action: 'Keep using versioned proof links and stale-proof guards for customer approvals.',
      href: '/proof-action',
    });

    checks.push({
      id: 'track-order-public-flow',
      group: 'Customer token flows',
      label: 'Track Order remains public but customer-scoped',
      status: 'pass',
      detail: 'Track Order is intentionally public for customer self-service and should only expose safe order status details for the supplied order/email context.',
      action: 'For public launch, test one real order and confirm no admin notes, internal IDs, or unrelated customer data are exposed.',
      href: '/track-order',
    });

    checks.push({
      id: 'launch-test-tools-protected',
      group: 'Test tooling',
      label: 'Launch test tools are admin-only',
      status: isProtectedPage('/launch-test-order') && isProtectedPage('/launch-test-data-cleanup') ? 'pass' : 'fail',
      detail: isProtectedPage('/launch-test-order') && isProtectedPage('/launch-test-data-cleanup') ? 'Launch test order and test data cleanup tools are covered by the /launch protected prefix.' : 'Launch test tools are not fully protected.',
      action: 'Keep test tools protected and clearly marked as TEST-HOLO before public launch.',
      href: '/launch-test-order',
    });

    checks.push({
      id: 'security-audit-self-protected',
      group: 'Audit page access',
      label: 'Security audit page is admin-only',
      status: isProtectedPage('/launch-security-access-audit') ? 'pass' : 'fail',
      detail: isProtectedPage('/launch-security-access-audit') ? 'The audit page itself is protected by the /launch protected prefix.' : 'The audit page is not covered by protected middleware prefixes.',
      action: 'Never leave security audit/admin visibility pages public.',
      href: '/launch-security-access-audit',
    });

    const summary = summarize(checks);
    const hardBlockers = checks.filter((check) => check.status === 'fail');
    const reviewItems = checks.filter((check) => check.status === 'warn');

    return NextResponse.json({
      ok: hardBlockers.length === 0,
      source: 'launch-security-access-audit',
      mode: 'read-only',
      launchStatus: hardBlockers.length ? 'blocked' : reviewItems.length ? 'review' : 'secure',
      summary,
      groups: groupCounts(checks),
      hardBlockers,
      reviewItems,
      checks,
      surfaces: {
        adminSurfaces,
        publicCustomerSurfaces,
        internalAdminApis,
        customerAllowedApis,
        protectedPrefixes,
        publicPagePrefixes,
        publicInternalPrefixes,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'launch-security-access-audit', error: error instanceof Error ? error.message : 'Launch security audit failed.' }, { status: 500 });
  }
}
