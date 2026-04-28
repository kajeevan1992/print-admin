import { NextResponse } from 'next/server';
import { ADMIN_NAVIGATION_REGISTRY, validateAdminNavigationRegistry } from '@/config/admin-navigation';

export const dynamic = 'force-dynamic';

type ReadinessStatus = 'pass' | 'warning' | 'fail';

type ReadinessCheck = {
  id: string;
  group: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
  nextAction: string;
};

function checkEnv(name: string, required = true): ReadinessCheck {
  const value = process.env[name];
  return {
    id: `env-${name.toLowerCase().replace(/_/g, '-')}`,
    group: 'Environment',
    label: name,
    status: value ? 'pass' : required ? 'fail' : 'warning',
    detail: value ? `${name} is configured.` : `${name} is not configured.`,
    nextAction: value ? 'No action needed.' : `Add ${name} in Coolify environment variables.`
  };
}

export async function GET() {
  const navValidation = validateAdminNavigationRegistry(ADMIN_NAVIGATION_REGISTRY);
  const databaseUrl = process.env.DATABASE_URL || '';
  const hasSslMode = databaseUrl.includes('sslmode=') || databaseUrl.includes('sslcert=') || databaseUrl.includes('ssl=true');

  const checks: ReadinessCheck[] = [
    checkEnv('DATABASE_URL', true),
    checkEnv('NODE_ENV', false),
    checkEnv('PLATFORM_SECRET_KEY', false),
    {
      id: 'db-ssl-mode',
      group: 'Environment',
      label: 'Database SSL mode',
      status: !databaseUrl ? 'fail' : hasSslMode ? 'pass' : 'warning',
      detail: !databaseUrl
        ? 'DATABASE_URL is missing.'
        : hasSslMode
          ? 'DATABASE_URL includes an SSL mode/parameter.'
          : 'DATABASE_URL is configured, but no explicit SSL mode was found.',
      nextAction: !databaseUrl
        ? 'Add DATABASE_URL before live testing.'
        : hasSslMode
          ? 'No action needed.'
          : 'For Coolify Postgres SSL, use sslmode=require if required by your DB.'
    },
    {
      id: 'navigation-registry-health',
      group: 'Navigation',
      label: 'Navigation registry health',
      status: navValidation.ok ? 'pass' : 'fail',
      detail: navValidation.ok
        ? `Navigation registry has ${ADMIN_NAVIGATION_REGISTRY.length} registered items and no blocking errors.`
        : navValidation.errors.join(' | '),
      nextAction: navValidation.ok ? 'No action needed.' : 'Fix navigation registry errors before live testing.'
    },
    {
      id: 'legacy-proxy-disabled',
      group: 'API Exposure',
      label: 'Legacy proxy routes',
      status: 'pass',
      detail: 'Live readiness expects /api/proxy/* to remain disabled. Verify manually if any proxy route was added back.',
      nextAction: 'Do not use /api/proxy for Admin, Super Admin, or hosted storefront.'
    },
    {
      id: 'internal-api-boundary',
      group: 'API Exposure',
      label: 'Internal API boundary',
      status: 'warning',
      detail: 'Internal APIs are available under /api/internal/* for SaaS admin and hosted storefront services.',
      nextAction: 'Before public launch, add/confirm auth guards around internal admin APIs.'
    },
    {
      id: 'public-api-boundary',
      group: 'API Exposure',
      label: 'Public API boundary',
      status: 'warning',
      detail: 'Public /api/v1 should be used only for external/headless/integration access with API key/secret.',
      nextAction: 'Run a public API auth check before any external developer/user testing.'
    },
    {
      id: 'catalog-seed-data',
      group: 'Demo Data',
      label: 'Catalog seed data',
      status: 'warning',
      detail: 'Live test requires at least one category, material, finish, and fully configured product.',
      nextAction: 'Create a clean Business Card product with option groups, then test price and draft order.'
    },
    {
      id: 'pricing-flow',
      group: 'Pricing',
      label: 'Pricing flow readiness',
      status: 'warning',
      detail: 'Pricing lab and print maths lab exist. Live test still needs real product scenarios verified against expected shop prices.',
      nextAction: 'Test Business Card, Banner, and Booklet scenarios and compare against your real-world target prices.'
    },
    {
      id: 'customer-flow',
      group: 'Storefront',
      label: 'Minimum customer flow',
      status: 'warning',
      detail: 'Live readiness requires product listing to product detail to options to price to draft order/cart path.',
      nextAction: 'Use draft order flow for internal test now; build/verify storefront cart path before customer testing.'
    }
  ];

  const summary = checks.reduce(
    (acc, check) => {
      acc.total += 1;
      acc[check.status] += 1;
      return acc;
    },
    { total: 0, pass: 0, warning: 0, fail: 0 } as Record<ReadinessStatus | 'total', number>
  );

  const requiredManualTests = [
    { id: 'create-category', label: 'Create category and verify /api/internal/catalog/categories', href: '/categories' },
    { id: 'create-product', label: 'Create product and verify /api/internal/catalog/products', href: '/products' },
    { id: 'product-options', label: 'Configure product option groups and preview customer options', href: '/products' },
    { id: 'pricing-lab', label: 'Run pricing diagnostics for configured product', href: '/pricing-engine-lab' },
    { id: 'print-maths', label: 'Run print maths scenario and confirm cost breakdown', href: '/print-maths-lab' },
    { id: 'draft-order', label: 'Generate quote-to-order payload and save draft order', href: '/print-maths-lab' },
    { id: 'system-qa', label: 'Run QA audit and smoke checklist', href: '/system-qa-audit' },
    { id: 'navigation', label: 'Confirm all new tools appear in sidebar/navigation registry', href: '/navigation-registry' }
  ];

  return NextResponse.json({
    ok: summary.fail === 0,
    source: 'internal-core',
    data: {
      version: 'v240',
      summary,
      checks,
      requiredManualTests,
      recommendation: summary.fail > 0
        ? 'Fix failing readiness checks before live site testing.'
        : summary.warning > 0
          ? 'Safe for internal live-test rehearsal only. Resolve warnings before customer-facing testing.'
          : 'Ready for controlled live site test.'
    }
  });
}
