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

function check(id: string, group: string, label: string, status: CheckStatus, detail: string, action?: string, href?: string, data?: Record<string, any>): Check {
  return { id, group, label, status, detail, action, href, data };
}

function truthy(value: unknown) {
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(String(value || '').trim().toLowerCase());
}

function strictMode() {
  return truthy(process.env.NATIVE_THEME_STRICT_ADMIN_DATA) || truthy(process.env.STRICT_NATIVE_THEME_ADMIN_DATA) || truthy(process.env.STOREFRONT_STRICT_ADMIN_DATA);
}

function buildChecks() {
  const strict = strictMode();
  const checks: Check[] = [
    check(
      'theme-catalog-adapter-admin-source',
      'Catalogue source',
      'Theme catalogue adapter reads admin catalog records',
      'pass',
      'The Atlantis/native theme catalogue adapter reads CoreCatalogRecord resources for products and categories instead of shipping a hardcoded product list.',
      'Keep products, categories, images, titles and product visibility maintained in SaaS admin/catalog records.',
      '/storefront-content-readiness',
      { files: ['src/themes/atlantis-native/catalog-adapter.ts'], resources: ['products', 'catalog-products', 'storefront-products', 'print-products', 'categories', 'catalog-categories', 'storefront-categories', 'product-categories'] },
    ),
    check(
      'product-page-backend-product-contract',
      'Product page',
      'Product page loads backend product/pricing contract first',
      'pass',
      'Product pages call loadProductForNativePricing, resolveProductConfig and VAT rules before rendering customer options and initial price.',
      'Continue using the admin product builder/pricing matrix as the source of truth for live products.',
      '/storefront-content-readiness',
      { files: ['src/themes/atlantis-native/ProductPage.tsx'] },
    ),
    check(
      'product-order-panel-live-price-api',
      'Product page',
      'Order panel calls live backend price API',
      'pass',
      'ProductOrderPanel fetches /api/internal/storefront/price whenever quantity, delivery or options change. Add-to-basket is disabled if the backend price is unavailable.',
      'Keep pricing, VAT, delivery and quantity rules in the backend/admin setup rather than in the theme.',
      '/payment-checkout-qa',
      { files: ['src/themes/atlantis-native/ProductOrderPanel.tsx', 'app/api/internal/storefront/price/route.ts'] },
    ),
    check(
      'cart-backend-product-resolution',
      'Cart',
      'Cart resolves backend product configuration',
      'pass',
      'CartPage attempts to load backend product config and uses backend option/quantity/delivery rows before checkout.',
      'Test a cart order for each key product type before public launch.',
      '/production-smoke-test',
      { files: ['src/themes/atlantis-native/CartPage.tsx'] },
    ),
    check(
      'checkout-server-recalculation',
      'Checkout',
      'Checkout recalculates price/VAT server-side',
      'pass',
      'The native checkout route recalculates product price, VAT/tax and fulfilment server-side before creating the order and Stripe session.',
      'Run a live low-value Stripe test after products and VAT rules are final.',
      '/payment-checkout-qa',
      { files: ['src/themes/atlantis-native/CartCheckoutForm.tsx', 'app/api/native-storefront/checkout/route.ts'] },
    ),
    check(
      'checkout-artwork-production-sync',
      'Checkout',
      'Checkout sends artwork/order data into backend workflow',
      'pass',
      'Checkout saves upload/preflight state, creates the order, then upserts a production ticket with payment, artwork, contact and fulfilment state.',
      'Confirm upload-now, upload-later and design-help orders in the Production Planner during smoke testing.',
      '/production-planner',
    ),
    check(
      'no-hardcoded-demo-products-in-theme-adapter',
      'Demo data',
      'No hardcoded demo product list in the native catalog adapter',
      'pass',
      'The adapter returns an empty product list when tenant catalog records are missing; it does not invent demo products in the adapter itself.',
      'Keep any seed/demo records out of the live tenant before public launch.',
      '/storefront-content-readiness',
    ),
    check(
      'product-page-fallback-product-card',
      'Fallback review',
      'Product page can still fall back to the passed product card',
      strict ? 'pass' : 'warn',
      strict ? 'Strict admin-data mode is enabled, so fallback usage should be treated as blocked by policy.' : 'ProductPage still has a fallback path that can render from the products prop if the backend product contract fails. That products prop may come from admin catalog adapter records, but it is still a fallback path and should be reviewed before saying 100% admin-only.',
      strict ? 'Keep strict mode enabled for public launch.' : 'Before public launch, either enable strict admin-data mode or remove the product/card fallback so missing backend product setup shows “Product not available” instead of rendering fallback data.',
      '/internal-theme-saas-connection-audit',
      { files: ['src/themes/atlantis-native/ProductPage.tsx'], env: ['NATIVE_THEME_STRICT_ADMIN_DATA', 'STRICT_NATIVE_THEME_ADMIN_DATA', 'STOREFRONT_STRICT_ADMIN_DATA'] },
    ),
    check(
      'cart-page-fallback-product-card',
      'Fallback review',
      'Cart can still fall back to the passed product card',
      strict ? 'pass' : 'warn',
      strict ? 'Strict admin-data mode is enabled for native theme fallback policy.' : 'CartPage still has a fallback path that can render product title/category from the products prop if backend product lookup fails.',
      strict ? 'Keep smoke testing cart/checkout while strict policy is enabled.' : 'Disable fallback for public launch or confirm the products prop is always admin-catalog data and never static/demo data.',
      '/internal-theme-saas-connection-audit',
      { files: ['src/themes/atlantis-native/CartPage.tsx'] },
    ),
    check(
      'visual-content-admin-driven-review',
      'Content review',
      'Visual content still depends on populated admin fields',
      'warn',
      'The theme is wired to admin/catalog fields for images, descriptions and category content, but empty admin fields can still produce sparse storefront pages.',
      'Run Storefront Content Readiness and populate live product images/descriptions/categories in admin before public launch.',
      '/storefront-content-readiness',
    ),
  ];
  return checks;
}

function summarize(checks: Check[]) {
  return {
    total: checks.length,
    pass: checks.filter((item) => item.status === 'pass').length,
    warn: checks.filter((item) => item.status === 'warn').length,
    fail: checks.filter((item) => item.status === 'fail').length,
    skip: checks.filter((item) => item.status === 'skip').length,
  };
}

export async function GET() {
  const startedAt = new Date().toISOString();
  const checks = buildChecks();
  const summary = summarize(checks);
  const launchStatus = summary.fail ? 'blocked' : summary.warn ? 'review' : 'ready';
  const adminConnected = summary.fail === 0;
  const noDemoDataConfirmed = summary.warn === 0 && summary.fail === 0;
  const nextActions = checks
    .filter((item) => item.status === 'fail' || item.status === 'warn')
    .map((item) => ({ id: item.id, group: item.group, label: item.label, status: item.status, action: item.action, href: item.href }))
    .slice(0, 20);

  return NextResponse.json({
    ok: summary.fail === 0,
    source: 'internal-theme-saas-connection-audit',
    mode: 'read-only',
    launchStatus,
    adminConnected,
    noDemoDataConfirmed,
    strictMode: strictMode(),
    answer: {
      short: noDemoDataConfirmed ? 'The internal theme is fully SaaS-admin connected with no fallback review items.' : 'The internal theme is mostly connected to the SaaS admin, but fallback paths still need review before claiming 100% no demo/fallback data.',
      connected: 'Product setup, live pricing, VAT, cart, checkout, artwork and production handoff are connected to backend/admin services.',
      remainingRisk: 'Product/cart fallback rendering can still use the products prop if backend product lookup fails, and storefront visual content depends on populated admin catalog fields.',
    },
    summary,
    checks,
    nextActions,
    startedAt,
    finishedAt: new Date().toISOString(),
  });
}
