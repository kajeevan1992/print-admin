import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { listFulfilmentLocations } from '@/core/locations/location-manager.service';
import { resolveSeoForPath, buildSitemapXml } from '@/core/seo/seo-public-output.service';
import { getTenantEmailSettings } from '@/core/email/email-outbox-sender.service';
import { listCollectionPasses } from '@/core/collection/collection-handover.service';
import { listCollectionNotifications } from '@/core/collection/collection-notifications.service';
import { readyCollectionStatuses } from '@/core/collection/ready-collection-automation.service';
import { calculateDeliveryVat, calculateVatLine } from '@/core/tax/vat-rules';
import { buildOrderVatSummary } from '@/core/tax/order-vat-summary';

export type LaunchReadinessStatus = 'pass' | 'warn' | 'fail' | 'skip';

export type LaunchReadinessCheck = {
  id: string;
  group: string;
  label: string;
  status: LaunchReadinessStatus;
  detail: string;
  action?: string;
  href?: string;
  data?: Record<string, any>;
};

type RunnerOptions = {
  productSlug?: string;
  locationSlug?: string;
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function pass(id: string, group: string, label: string, detail: string, data?: Record<string, any>, href?: string): LaunchReadinessCheck {
  return { id, group, label, status: 'pass', detail, data, href };
}

function warn(id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string): LaunchReadinessCheck {
  return { id, group, label, status: 'warn', detail, action, data, href };
}

function fail(id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string): LaunchReadinessCheck {
  return { id, group, label, status: 'fail', detail, action, data, href };
}

function skip(id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string): LaunchReadinessCheck {
  return { id, group, label, status: 'skip', detail, action, data, href };
}

function moneyMinor(value: number) {
  return Math.round(value * 100);
}

function safeMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Check failed.';
}

async function tenantRecord(request: Request) {
  const ctx = tenantContextFromRequest(request);
  const tenantId = clean(ctx.tenantId);
  const tenant =
    (tenantId && (await (prisma as any).tenant.findUnique({ where: { id: tenantId } }).catch(() => null))) ||
    (tenantId && (await (prisma as any).tenant.findUnique({ where: { slug: tenantId } }).catch(() => null))) ||
    (await (prisma as any).tenant.findFirst({ orderBy: { createdAt: 'asc' } }).catch(() => null));
  return { ctx, tenant, tenantId: tenant?.id || tenantId || 'platform-demo' };
}

async function databaseChecks(request: Request): Promise<LaunchReadinessCheck[]> {
  const checks: LaunchReadinessCheck[] = [];
  try {
    const { ctx, tenant, tenantId } = await tenantRecord(request);
    if (!tenant) {
      checks.push(fail('tenant-record', 'Foundation', 'Tenant record', `No tenant was found for ${tenantId}.`, 'Create or seed the tenant before launch.', { requestedTenantId: ctx.tenantId }, '/tenant-control'));
      return checks;
    }
    checks.push(pass('tenant-record', 'Foundation', 'Tenant record', `Tenant ${tenant.name || tenant.id} is available.`, { tenantId: tenant.id, slug: tenant.slug, status: tenant.status }, '/tenant-control'));

    const productCount = await (prisma as any).product.count({ where: { tenantId: tenant.id, isActive: true } }).catch(() => 0);
    const categoryCount = await (prisma as any).category.count({ where: { tenantId: tenant.id } }).catch(() => 0);
    if (productCount > 0) checks.push(pass('catalog-products', 'Foundation', 'Active products', `${productCount} active product(s) found.`, { productCount, categoryCount }, '/products'));
    else checks.push(warn('catalog-products', 'Foundation', 'Active products', 'No active database products found. Storefront may rely on launch catalogue fallbacks only.', 'Seed or publish Holo Print launch products before final launch.', { productCount, categoryCount }, '/products'));
  } catch (error) {
    checks.push(fail('database-access', 'Foundation', 'Database access', safeMessage(error), 'Check DATABASE_URL and Prisma migration status.', undefined, '/database-manager'));
  }
  return checks;
}

async function locationChecks(request: Request): Promise<LaunchReadinessCheck[]> {
  const checks: LaunchReadinessCheck[] = [];
  try {
    const data = await listFulfilmentLocations(request, { status: 'all' });
    const items = data.items || [];
    const active = items.filter((item) => item.status === 'active');
    const sidcup = items.find((item) => item.slug === 'sidcup' || item.name.toLowerCase().includes('sidcup'));
    const readinessErrors = items.flatMap((item) => item.readiness?.errors || []);
    const readinessWarnings = items.flatMap((item) => item.readiness?.warnings || []);

    if (!items.length) checks.push(fail('locations-exist', 'Locations', 'Location records', 'No fulfilment locations were found.', 'Open Location Manager and seed the launch locations.', undefined, '/location-manager'));
    else checks.push(pass('locations-exist', 'Locations', 'Location records', `${items.length} location record(s) found.`, data.summary as any, '/location-manager'));

    if (active.length) checks.push(pass('locations-active', 'Locations', 'Active public locations', `${active.length} active location(s) available for storefront selection.`, { active: active.map((item) => item.slug) }, '/location-manager'));
    else checks.push(warn('locations-active', 'Locations', 'Active public locations', 'No active location is available for storefront collection selector.', 'Activate Sidcup or another valid collection/service location.', undefined, '/location-manager'));

    if (sidcup?.status === 'active') checks.push(pass('sidcup-main-store', 'Locations', 'Sidcup main store', 'Sidcup exists and is active.', { slug: sidcup.slug, type: sidcup.type, seoPath: sidcup.seo?.path }, '/location-manager'));
    else if (sidcup) checks.push(warn('sidcup-main-store', 'Locations', 'Sidcup main store', `Sidcup exists but is ${sidcup.status}.`, 'Set Sidcup to active before launch.', { slug: sidcup.slug, type: sidcup.type }, '/location-manager'));
    else checks.push(fail('sidcup-main-store', 'Locations', 'Sidcup main store', 'Sidcup location was not found.', 'Seed or create Holo Print Sidcup as the main store.', undefined, '/location-manager'));

    if (readinessErrors.length) checks.push(fail('location-readiness-errors', 'Locations', 'Location readiness errors', `${readinessErrors.length} location error(s) found.`, 'Fix location readiness errors in Location Manager.', { errors: readinessErrors.slice(0, 12) }, '/location-manager'));
    else if (readinessWarnings.length) checks.push(warn('location-readiness-errors', 'Locations', 'Location readiness warnings', `${readinessWarnings.length} warning(s) found.`, 'Review warnings before launch.', { warnings: readinessWarnings.slice(0, 12) }, '/location-manager'));
    else checks.push(pass('location-readiness-errors', 'Locations', 'Location readiness audit', 'No location readiness errors or warnings found.', undefined, '/location-manager'));
  } catch (error) {
    checks.push(fail('locations-load', 'Locations', 'Location Manager load', safeMessage(error), 'Check Location Manager storage and tenant context.', undefined, '/location-manager'));
  }
  return checks;
}

async function seoChecks(request: Request, options: RunnerOptions): Promise<LaunchReadinessCheck[]> {
  const checks: LaunchReadinessCheck[] = [];
  const productSlug = clean(options.productSlug) || 'business-cards';
  const locationSlug = clean(options.locationSlug) || 'sidcup';
  const productLocationPath = `/${productSlug}/${locationSlug}`;

  try {
    const home = await resolveSeoForPath(request, '/');
    if (home.found && !home.noIndex) checks.push(pass('seo-home', 'SEO', 'Homepage SEO', 'Homepage SEO resolves as indexable.', { title: home.title, canonicalUrl: home.canonicalUrl, robots: home.robots }, '/seo-engine'));
    else checks.push(warn('seo-home', 'SEO', 'Homepage SEO', 'Homepage SEO is using fallback or noindex data.', 'Seed/publish the homepage SEO page.', { found: home.found, robots: home.robots }, '/seo-engine'));
  } catch (error) {
    checks.push(fail('seo-home', 'SEO', 'Homepage SEO', safeMessage(error), 'Check SEO Engine storage.', undefined, '/seo-engine'));
  }

  try {
    const local = await resolveSeoForPath(request, productLocationPath);
    if (local.noIndex) checks.push(fail('seo-product-location', 'SEO', 'Product-location SEO', `${productLocationPath} resolved as noindex.`, 'Publish or fix product-location SEO before launch.', { path: productLocationPath, robots: local.robots }, '/seo-engine'));
    else if (local.found) checks.push(pass('seo-product-location', 'SEO', 'Product-location SEO', `${productLocationPath} has a saved SEO record.`, { title: local.title, robots: local.robots }, '/seo-engine'));
    else checks.push(warn('seo-product-location', 'SEO', 'Product-location SEO', `${productLocationPath} resolves using fallback SEO.`, 'Generate/publish saved SEO pages for important product + location combinations.', { title: local.title, robots: local.robots }, '/seo-engine'));
  } catch (error) {
    checks.push(fail('seo-product-location', 'SEO', 'Product-location SEO', safeMessage(error), 'Check product-location SEO generation.', undefined, '/seo-engine'));
  }

  try {
    const sitemap = await buildSitemapXml(request);
    if (sitemap.count > 0) checks.push(pass('seo-sitemap', 'SEO', 'Sitemap output', `${sitemap.count} URL(s) in sitemap output.`, { count: sitemap.count, sample: sitemap.urls.slice(0, 5) }, '/seo-engine'));
    else checks.push(warn('seo-sitemap', 'SEO', 'Sitemap output', 'Sitemap has no indexable URLs.', 'Publish indexable SEO pages before launch.', { count: 0 }, '/seo-engine'));
  } catch (error) {
    checks.push(fail('seo-sitemap', 'SEO', 'Sitemap output', safeMessage(error), 'Check SEO sitemap output.', undefined, '/seo-engine'));
  }

  return checks;
}

async function storefrontChecks(request: Request, options: RunnerOptions): Promise<LaunchReadinessCheck[]> {
  const checks: LaunchReadinessCheck[] = [];
  const productSlug = clean(options.productSlug) || 'business-cards';
  const locationSlug = clean(options.locationSlug) || 'sidcup';
  try {
    const locations = await listFulfilmentLocations(request, { publicOnly: true });
    const items = locations.items || [];
    const usable = items.filter((item) => !item.blockedProductSlugs?.includes(productSlug) && (!item.allowedProductSlugs?.length || item.allowedProductSlugs.includes(productSlug)));
    if (usable.length) checks.push(pass('checkout-collection-selector', 'Storefront', 'Collection selector data', `${usable.length} public location(s) available for ${productSlug}.`, { productSlug, locations: usable.map((item) => ({ slug: item.slug, type: item.type, status: item.status })) }, '/location-manager'));
    else checks.push(warn('checkout-collection-selector', 'Storefront', 'Collection selector data', `No public locations are available for ${productSlug}.`, 'Activate a location or adjust allowed/blocked product rules.', { productSlug }, '/location-manager'));

    const selected = items.find((item) => item.slug === locationSlug);
    if (selected) checks.push(pass('product-location-resolve', 'Storefront', 'Product-location resolver prerequisites', `${productSlug}/${locationSlug} can resolve with location data.`, { productSlug, locationSlug, localTruth: selected.metadata?.collectionTruth || '' }, '/location-manager'));
    else checks.push(warn('product-location-resolve', 'Storefront', 'Product-location resolver prerequisites', `${locationSlug} is not active/public, so product-location pages may use fallback location data.`, 'Activate the location if it should appear publicly.', { productSlug, locationSlug }, '/location-manager'));
  } catch (error) {
    checks.push(fail('storefront-locations', 'Storefront', 'Storefront location APIs', safeMessage(error), 'Check internal storefront location services.', undefined, '/location-manager'));
  }
  return checks;
}

async function collectionChecks(request: Request): Promise<LaunchReadinessCheck[]> {
  const checks: LaunchReadinessCheck[] = [];
  try {
    const passes = await listCollectionPasses(request, { status: 'all' });
    checks.push(pass('collection-pass-service', 'Collection', 'Collection pass service', `Collection pass service loaded. ${passes.summary?.total || 0} pass(es) currently stored.`, { summary: passes.summary, readyStatuses: readyCollectionStatuses() }, '/collection-handover'));
    if (!passes.summary?.total) checks.push(skip('collection-pass-test-data', 'Collection', 'Collection pass test data', 'No collection passes exist yet. This is okay before real test orders.', 'After placing a test collection order, confirm a pass appears here.', undefined, '/collection-handover'));
  } catch (error) {
    checks.push(fail('collection-pass-service', 'Collection', 'Collection pass service', safeMessage(error), 'Check collection handover service and CoreCatalogRecord storage.', undefined, '/collection-handover'));
  }

  try {
    const notifications = await listCollectionNotifications(request, { status: 'all' });
    checks.push(pass('collection-notification-service', 'Collection', 'Collection notification queue', `Notification queue loaded. ${notifications.summary?.total || 0} collection email(s) found.`, { summary: notifications.summary }, '/ready-collection-automation'));
  } catch (error) {
    checks.push(fail('collection-notification-service', 'Collection', 'Collection notification queue', safeMessage(error), 'Check collection notification queue/outbox storage.', undefined, '/ready-collection-automation'));
  }

  return checks;
}

async function emailChecks(request: Request): Promise<LaunchReadinessCheck[]> {
  const checks: LaunchReadinessCheck[] = [];
  try {
    const email = await getTenantEmailSettings(request);
    if (email.safe.configured) checks.push(pass('email-settings', 'Email', 'Tenant email settings', `SMTP is configured for ${email.safe.fromEmail}.`, { settings: email.safe }, '/email-send-controls'));
    else checks.push(warn('email-settings', 'Email', 'Tenant email settings', 'SMTP is not fully configured. Queue-only mode is safe, but live emails will not send.', 'Add SMTP settings or tenant email settings before launch.', { settings: email.safe }, '/email-settings'));
  } catch (error) {
    checks.push(fail('email-settings', 'Email', 'Tenant email settings', safeMessage(error), 'Check email settings/outbox service.', undefined, '/email-settings'));
  }
  return checks;
}

function vatChecks(): LaunchReadinessCheck[] {
  const checks: LaunchReadinessCheck[] = [];
  try {
    const leaflet = calculateVatLine({ productName: 'A5 Flyers & Leaflets', totalPriceMinor: moneyMinor(29), taxSettings: { preset: 'leaflets-flyers', taxClass: 'zero' } }, 1, moneyMinor(29));
    const businessCard = calculateVatLine({ productName: 'Business Cards', totalPriceMinor: moneyMinor(19), taxSettings: { preset: 'business-cards', taxClass: 'standard' } }, 1, moneyMinor(19));
    const design = calculateVatLine({ productName: 'Design Service / Artwork Help', totalPriceMinor: moneyMinor(40), taxSettings: { taxClass: 'zero', forceVatOnDesignServices: true } }, 1, moneyMinor(40));
    const delivery = calculateDeliveryVat({ label: 'Local delivery', taxClass: 'standard' }, moneyMinor(6));
    const summary = buildOrderVatSummary({
      currency: 'GBP',
      items: [
        { titleSnapshot: 'A5 Flyers & Leaflets', totalPriceMinor: leaflet.grossMinor, metadataJson: leaflet },
        { titleSnapshot: 'Business Cards', totalPriceMinor: businessCard.grossMinor, metadataJson: businessCard },
        { titleSnapshot: 'Design Service / Artwork Help', totalPriceMinor: design.grossMinor, metadataJson: design },
      ],
      shippingMinor: delivery.grossMinor,
      taxMinor: leaflet.vatMinor + businessCard.vatMinor + design.vatMinor + delivery.vatMinor,
      totalMinor: leaflet.grossMinor + businessCard.grossMinor + design.grossMinor + delivery.grossMinor,
      vatBreakdown: [
        { rate: leaflet.vatRate, vatClass: leaflet.vatClass, netMinor: leaflet.netMinor, vatMinor: leaflet.vatMinor, grossMinor: leaflet.grossMinor, reasons: [leaflet.vatReason] },
        { rate: businessCard.vatRate, vatClass: businessCard.vatClass, netMinor: businessCard.netMinor + design.netMinor + delivery.netMinor, vatMinor: businessCard.vatMinor + design.vatMinor + delivery.vatMinor, grossMinor: businessCard.grossMinor + design.grossMinor + delivery.grossMinor, reasons: [businessCard.vatReason, design.vatReason, delivery.vatReason] },
      ],
    });
    const ok = leaflet.vatRate === 0 && businessCard.vatRate === 20 && design.vatRate === 20 && summary.isMixedVat;
    if (ok) checks.push(pass('vat-mixed-order', 'VAT', 'Mixed VAT sanity check', 'Leaflets are zero-rated, business cards/design/delivery are standard-rated and mixed VAT summary is produced.', { leaflet, businessCard, design, delivery, summary }, '/tax-vat-settings'));
    else checks.push(fail('vat-mixed-order', 'VAT', 'Mixed VAT sanity check', 'VAT sanity check did not match expected Holo Print rules.', 'Review Tax / VAT Settings before launch.', { leaflet, businessCard, design, delivery, summary }, '/tax-vat-settings'));
  } catch (error) {
    checks.push(fail('vat-mixed-order', 'VAT', 'Mixed VAT sanity check', safeMessage(error), 'Check VAT rule services.', undefined, '/tax-vat-settings'));
  }
  return checks;
}

export async function runLaunchReadinessRunner(request: Request, options: RunnerOptions = {}) {
  const startedAt = new Date().toISOString();
  const checks = [
    ...(await databaseChecks(request)),
    ...(await locationChecks(request)),
    ...(await seoChecks(request, options)),
    ...(await storefrontChecks(request, options)),
    ...(await collectionChecks(request)),
    ...(await emailChecks(request)),
    ...vatChecks(),
  ];
  const summary = {
    total: checks.length,
    pass: checks.filter((item) => item.status === 'pass').length,
    warn: checks.filter((item) => item.status === 'warn').length,
    fail: checks.filter((item) => item.status === 'fail').length,
    skip: checks.filter((item) => item.status === 'skip').length,
  };
  const score = Math.max(0, Math.round(((summary.pass + summary.skip * 0.5) / Math.max(1, summary.total)) * 100 - summary.fail * 10 - summary.warn * 3));
  const launchStatus = summary.fail ? 'blocked' : summary.warn ? 'review' : 'ready';
  return {
    ok: summary.fail === 0,
    source: 'launch-readiness-runner',
    mode: 'read-only',
    launchStatus,
    score,
    startedAt,
    finishedAt: new Date().toISOString(),
    summary,
    checks,
    nextActions: checks.filter((item) => item.status === 'fail' || item.status === 'warn').map((item) => ({ id: item.id, label: item.label, status: item.status, action: item.action, href: item.href })).slice(0, 12),
  };
}
