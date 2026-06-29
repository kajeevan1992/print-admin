import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import type { TenantContext } from '@/core/tenant/types';

export const CUSTOMER_LANDING_PAGES_CONFIG_KEY = 'content-customer-landing-pages';
const CONFIG_RESOURCE = 'admin-config' as any;

export type CustomerLandingPage = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  pageType: string;
  tenantDisplayName: string;
  brandColor: string;
  heroKicker: string;
  heroHeadline: string;
  heroSubheading: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  productCategoriesText: string;
  featureCardsText: string;
  workflowStepsText: string;
  trustBadgesText: string;
  industriesText: string;
  faqText: string;
  seoTitle: string;
  seoDescription: string;
  updatedAt?: string;
};

function text(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

function status(value: unknown): CustomerLandingPage['status'] {
  const candidate = text(value || 'draft').toLowerCase();
  if (candidate === 'published' || candidate === 'archived') return candidate;
  return 'draft';
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

export function normaliseCustomerLandingPage(input: Record<string, unknown>, index = 0): CustomerLandingPage {
  const title = text(input.title || input.name, `Customer landing page ${index + 1}`);
  const slug = slugify(text(input.slug || input.friendlyUrl || title, `landing-page-${index + 1}`)) || `landing-page-${index + 1}`;

  return {
    id: text(input.id, `landing-page-${index + 1}`),
    title,
    slug,
    status: status(input.status),
    pageType: text(input.pageType, 'customer-homepage'),
    tenantDisplayName: text(input.tenantDisplayName || input.businessName, 'Your Print Shop'),
    brandColor: text(input.brandColor, '#18a7d0'),
    heroKicker: text(input.heroKicker, 'Online print ordering'),
    heroHeadline: text(input.heroHeadline, `Order print online from ${text(input.tenantDisplayName || input.businessName, 'your local print shop')}`),
    heroSubheading: text(input.heroSubheading, 'Instant print ordering, artwork upload, collection and delivery from one branded storefront.'),
    primaryCtaLabel: text(input.primaryCtaLabel, 'Start an order'),
    primaryCtaUrl: text(input.primaryCtaUrl, '/products'),
    secondaryCtaLabel: text(input.secondaryCtaLabel, 'Request a quote'),
    secondaryCtaUrl: text(input.secondaryCtaUrl, '/quote'),
    productCategoriesText: text(input.productCategoriesText, 'Business Cards\nFlyers & Leaflets\nBooklets\nBanners & Signage\nStickers & Labels\nWedding Stationery'),
    featureCardsText: text(input.featureCardsText, 'Instant pricing — Customers choose size, material, finishing and turnaround before checkout.\nArtwork upload — Collect files, notes and proof approval inside the order flow.\nLocal fulfilment — Promote same-day collection, delivery zones and collection points.'),
    workflowStepsText: text(input.workflowStepsText, 'Choose a product\nConfigure print options\nUpload artwork\nApprove proof\nCollect or receive delivery'),
    trustBadgesText: text(input.trustBadgesText, 'Same-day options\nSecure checkout\nArtwork checked before print\nLocal collection available'),
    industriesText: text(input.industriesText, 'Local businesses\nEvents & exhibitions\nRestaurants & takeaways\nSchools & charities\nWedding suppliers'),
    faqText: text(input.faqText, 'Can I upload artwork later? — Yes, customers can order first and upload artwork during checkout or after order approval.\nDo you check artwork? — Yes, artwork can be reviewed before production.\nCan customers collect locally? — Yes, collection, delivery and custom handover messages can be configured.'),
    seoTitle: text(input.seoTitle, `${title} | Online print ordering`),
    seoDescription: text(input.seoDescription, 'A customer landing page for online print ordering, instant pricing, artwork upload and local print fulfilment.'),
    updatedAt: text(input.updatedAt, ''),
  };
}

async function readConfiguredItems(ctx: TenantContext): Promise<Record<string, unknown>[]> {
  try {
    const record = await getInternalCatalogRecord(ctx, CONFIG_RESOURCE, CUSTOMER_LANDING_PAGES_CONFIG_KEY);
    const metadata = (record as Record<string, any>)?.metadataJson;
    const items = metadata?.items;
    return Array.isArray(items) ? items as Record<string, unknown>[] : [];
  } catch {
    return [];
  }
}

export async function listCustomerLandingPages(ctx: TenantContext, options: { includeDrafts?: boolean } = {}) {
  const pages = (await readConfiguredItems(ctx)).map(normaliseCustomerLandingPage);
  if (options.includeDrafts) return pages.filter((page) => page.status !== 'archived');
  return pages.filter((page) => page.status === 'published');
}

export async function resolveCustomerLandingPage(ctx: TenantContext, slug: string, options: { includeDrafts?: boolean } = {}) {
  const cleanSlug = slugify(slug);
  if (!cleanSlug) return null;
  const pages = await listCustomerLandingPages(ctx, options);
  return pages.find((page) => page.slug === cleanSlug || page.id === slug) ?? null;
}

export function splitLandingPageLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function splitLandingPagePairs(value: string) {
  return splitLandingPageLines(value).map((line) => {
    const [title, ...rest] = line.split(/\s+[-–—]\s+/);
    return { title: title.trim(), body: rest.join(' — ').trim() };
  });
}
