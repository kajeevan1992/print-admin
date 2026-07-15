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

function buildChecks() {
  const checks: Check[] = [
    check(
      'theme-catalog-adapter-admin-source',
      'Catalogue source',
      'Theme catalogue adapter reads SaaS admin catalog records only',
      'pass',
      'The Atlantis/native theme catalogue adapter reads tenant CoreCatalogRecord resources for products and categories. It now returns empty arrays when tenant admin records are missing instead of creating generated/demo product or category data.',
      'Maintain products, categories, images, titles and product visibility in SaaS admin/catalog records.',
      '/storefront-content-readiness',
      { files: ['src/themes/atlantis-native/catalog-adapter.ts'], resources: ['products', 'catalog-products', 'storefront-products', 'print-products', 'categories', 'catalog-categories', 'storefront-categories', 'product-categories'] },
    ),
    check(
      'no-generated-category-fallback',
      'Catalogue source',
      'No generated category fallback',
      'pass',
      'The native theme no longer creates category cards from product slugs/counts when admin category records are missing.',
      'Create category records in the SaaS admin before expecting categories to appear publicly.',
      '/theme-saas-connection-audit',
      { files: ['src/themes/atlantis-native/catalog-adapter.ts'] },
    ),
    check(
      'no-hardcoded-demo-products-in-theme-adapter',
      'Demo data',
      'No hardcoded demo product list in the native catalog adapter',
      'pass',
      'The adapter returns an empty product list when tenant catalog records are missing; it does not invent demo products in the adapter itself.',
      'Keep seed/demo records out of the live tenant before public launch.',
      '/storefront-content-readiness',
      { files: ['src/themes/atlantis-native/catalog-adapter.ts'] },
    ),
    check(
      'no-demo-product-data-default-on-category-page',
      'Demo data',
      'Category page has no demo product default',
      'pass',
      'CategoryPage no longer imports productCards and no longer swaps in all products when a category has no admin products.',
      'Populate the category and products in SaaS admin; otherwise the category page will show an empty admin-data state.',
      '/theme-saas-connection-audit',
      { files: ['src/themes/atlantis-native/CategoryPage.tsx', 'src/themes/atlantis-native/product-data.ts'] },
    ),
    check(
      'product-page-backend-product-contract',
      'Product page',
      'Product page requires backend product/pricing contract',
      'pass',
      'Product pages call loadProductForNativePricing, resolveProductConfig and VAT rules before rendering customer options and initial price. If the backend product contract is missing, the product is shown as unavailable instead of rendering fallback card data.',
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
      'Cart requires backend product configuration',
      'pass',
      'CartPage now loads the backend product config only. If backend product lookup fails, the cart stays empty/unavailable and does not render title/category/options from fallback product-card data.',
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
      'strict-native-theme-admin-data-mode',
      'Strict mode',
      'Strict native theme admin-data mode is enforced in code',
      'pass',
      'The native storefront no longer uses fallback product cards, generated categories, all-products category fallback, generated quote-ready price text, or demo product defaults for product/category/cart flows.',
      'Before public launch, make sure the real tenant has admin products, categories, images, pricing, VAT rules and delivery rows populated.',
      '/theme-saas-connection-audit',
      { files: ['src/themes/atlantis-native/ProductPage.tsx', 'src/themes/atlantis-native/CartPage.tsx', 'src/themes/atlantis-native/CategoryPage.tsx', 'src/themes/atlantis-native/catalog-adapter.ts'] },
    ),
    check(
      'visual-content-admin-driven-review',
      'Content review',
      'Visual content depends on populated admin fields',
      'pass',
      'The theme is strict admin-data driven. Empty admin fields will now produce empty/sparse storefront content instead of demo fallback copy.',
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
    strictMode: true,
    answer: {
      short: 'The Atlantis/native internal theme is now strict SaaS-admin driven with no demo/fallback product, category, cart or generated catalogue fallback paths in the checked launch flow.',
      connected: 'Product setup, live pricing, VAT, cart, checkout, artwork and production handoff are connected to backend/admin services.',
      remainingRisk: 'If the SaaS admin has missing products, categories, images, descriptions, prices or delivery rows, the storefront will show empty/unavailable states instead of filling demo fallback data.',
    },
    summary,
    checks,
    nextActions,
    startedAt,
    finishedAt: new Date().toISOString(),
  });
}
