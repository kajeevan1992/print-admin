import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { saveSeoPage, type SeoPageRecord } from '@/core/seo/seo-engine.service';

export type FulfilmentLocationType = 'main-store' | 'owned-branch' | 'partner-collection-point' | 'service-area';
export type FulfilmentLocationStatus = 'draft' | 'active' | 'paused' | 'hidden';

type HoursRow = { day: string; open: string; close: string; closed?: boolean };
type DropScheduleRow = { day: string; dropBy: string; readyFrom: string; note?: string };

export type FulfilmentLocationRecord = {
  id: string;
  slug: string;
  name: string;
  type: FulfilmentLocationType;
  status: FulfilmentLocationStatus;
  publicPageEnabled: boolean;
  seoPageEnabled: boolean;
  googleBusinessEligible: boolean;
  address: { line1?: string; line2?: string; town?: string; county?: string; postcode?: string; country?: string };
  contact: { phone?: string; email?: string; managerName?: string };
  openingHours: HoursRow[];
  collectionHours: HoursRow[];
  cutoffTime: string;
  dropSchedule: DropScheduleRow[];
  pickupInstructions: string;
  customerFacingDescription: string;
  adminNotes?: string;
  allowedProductSlugs: string[];
  blockedProductSlugs: string[];
  collectionFeeMinor: number;
  partnerFeeMinor: number;
  priority: number;
  seo: { path: string; title: string; metaDescription: string; h1: string; targetKeyword: string; schemaTypes: string[] };
  metadata?: Record<string, any>;
  readiness?: { score: number; warnings: string[]; errors: string[] };
  createdAt?: string;
  updatedAt?: string;
};

const RESOURCE = 'fulfilment-locations';
const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk').replace(/\/$/, '');

function slugify(value: string) {
  return String(value || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'location';
}
function pathFor(location: Pick<FulfilmentLocationRecord, 'type' | 'slug'>) {
  if (location.type === 'main-store' || location.type === 'owned-branch') return `/locations/${location.slug}`;
  if (location.type === 'partner-collection-point') return `/print-collection/${location.slug}`;
  return `/printing/${location.slug}`;
}
function defaultHours(): HoursRow[] {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => ({ day, open: '09:00', close: '17:30' }));
}
function defaultDropSchedule(): DropScheduleRow[] {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => ({ day, dropBy: '16:00', readyFrom: 'Next working day', note: 'Subject to payment and artwork approval.' }));
}
function seoFor(location: FulfilmentLocationRecord) {
  const path = pathFor(location);
  if (location.type === 'main-store' || location.type === 'owned-branch') return {
    path,
    title: `Printing in ${location.name} | Local Print Shop | Holo Print`,
    metaDescription: `Holo Print provides local printing in ${location.name}: business cards, flyers, banners, posters, stickers, signage, booklets, artwork help and collection options.`,
    h1: `Printing in ${location.name}`,
    targetKeyword: `printing in ${location.name}`,
    schemaTypes: ['LocalBusiness', 'Organization', 'BreadcrumbList', 'FAQPage', 'WebPage'],
  };
  if (location.type === 'partner-collection-point') return {
    path,
    title: `Print Collection ${location.name} | Order Online, Collect Locally | Holo Print`,
    metaDescription: `Order print online from Holo Print and collect in ${location.name} from an approved partner collection point where available. Honest local collection, not a fake branch.`,
    h1: `Print collection in ${location.name}`,
    targetKeyword: `print collection ${location.name}`,
    schemaTypes: ['CollectionPage', 'BreadcrumbList', 'FAQPage', 'WebPage'],
  };
  return {
    path,
    title: `Printing for ${location.name} | Online Print & Delivery | Holo Print`,
    metaDescription: `Holo Print supports customers in ${location.name} with online print ordering, artwork upload, quotes, delivery and future collection options.`,
    h1: `Printing for customers in ${location.name}`,
    targetKeyword: `printing ${location.name}`,
    schemaTypes: ['Service', 'BreadcrumbList', 'FAQPage', 'WebPage'],
  };
}

function auditLocation(location: FulfilmentLocationRecord) {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!location.name) errors.push('Location name is required.');
  if (!location.slug) errors.push('Location slug is required.');
  if ((location.type === 'main-store' || location.type === 'owned-branch' || location.type === 'partner-collection-point') && !location.address?.postcode) warnings.push('Physical/collection location is missing postcode.');
  if ((location.type === 'main-store' || location.type === 'owned-branch') && !location.googleBusinessEligible) errors.push('Owned store/branch should normally be Google Business eligible.');
  if ((location.type === 'partner-collection-point' || location.type === 'service-area') && location.googleBusinessEligible) errors.push('Partner collection points/service areas must not be marked Google Business eligible as fake branches.');
  if (location.type === 'partner-collection-point' && location.seo.schemaTypes.includes('LocalBusiness')) errors.push('Partner collection point must not use LocalBusiness schema.');
  if (location.type === 'service-area' && location.seo.schemaTypes.includes('LocalBusiness')) errors.push('Service area must not use LocalBusiness schema.');
  if (!location.pickupInstructions && location.type !== 'service-area') warnings.push('Pickup instructions are missing.');
  if (!location.cutoffTime) warnings.push('Cutoff time is missing.');
  if (!location.openingHours?.length && location.type !== 'service-area') warnings.push('Opening hours are missing.');
  if (!location.customerFacingDescription || location.customerFacingDescription.length < 80) warnings.push('Customer-facing description is short; add useful local context.');
  if (location.seoPageEnabled && !location.seo?.path) errors.push('SEO page enabled but SEO path is missing.');
  const score = Math.max(0, 100 - errors.length * 20 - warnings.length * 6);
  return { score, warnings, errors };
}

function normalise(input: Partial<FulfilmentLocationRecord>): FulfilmentLocationRecord {
  const name = String(input.name || 'Sidcup').trim();
  const slug = slugify(input.slug || name);
  const type = input.type || 'partner-collection-point';
  const base: FulfilmentLocationRecord = {
    id: String(input.id || `loc-${slug}`), slug, name, type, status: input.status || 'draft',
    publicPageEnabled: input.publicPageEnabled ?? true,
    seoPageEnabled: input.seoPageEnabled ?? true,
    googleBusinessEligible: input.googleBusinessEligible ?? (type === 'main-store' || type === 'owned-branch'),
    address: { country: 'GB', ...(input.address || {}) },
    contact: input.contact || {},
    openingHours: input.openingHours?.length ? input.openingHours : defaultHours(),
    collectionHours: input.collectionHours?.length ? input.collectionHours : (input.openingHours?.length ? input.openingHours : defaultHours()),
    cutoffTime: input.cutoffTime || '15:00',
    dropSchedule: input.dropSchedule?.length ? input.dropSchedule : defaultDropSchedule(),
    pickupInstructions: input.pickupInstructions || 'Bring your order confirmation, collection PIN or QR code when collecting.',
    customerFacingDescription: input.customerFacingDescription || `${name} is available in Holo Print as a ${type.replace(/-/g, ' ')} for local print ordering, collection or delivery planning.`,
    adminNotes: input.adminNotes || '',
    allowedProductSlugs: input.allowedProductSlugs || [],
    blockedProductSlugs: input.blockedProductSlugs || [],
    collectionFeeMinor: Number(input.collectionFeeMinor || 0),
    partnerFeeMinor: Number(input.partnerFeeMinor || 0),
    priority: Number(input.priority || 100),
    seo: input.seo || {} as any,
    metadata: input.metadata || {},
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  base.seo = { ...seoFor(base), ...(input.seo || {}) };
  base.readiness = auditLocation(base);
  return base;
}

function toRecord(row: any): FulfilmentLocationRecord {
  return normalise({ id: row.id, slug: row.slug, name: row.name, ...(row.metadataJson || {}), createdAt: row.createdAt, updatedAt: row.updatedAt });
}
function toMetadata(location: FulfilmentLocationRecord) {
  return { ...location, readiness: auditLocation(location) };
}

export const defaultFulfilmentLocations: Partial<FulfilmentLocationRecord>[] = [
  { id: 'loc-sidcup', slug: 'sidcup', name: 'Sidcup', type: 'main-store', status: 'active', googleBusinessEligible: true, address: { line1: 'Sidcup High Street', town: 'Sidcup', county: 'London', country: 'GB' }, contact: { email: 'sales@holoprint.co.uk', phone: '020 3336 0322' }, cutoffTime: '15:00', pickupInstructions: 'Collect from Holo Print Sidcup. Bring your order confirmation or collection PIN.', customerFacingDescription: 'Holo Print Sidcup is the main production and collection store for local customers ordering print, signage, design support and artwork services online or in person.', priority: 1 },
  { id: 'loc-wimbledon', slug: 'wimbledon', name: 'Wimbledon', type: 'partner-collection-point', status: 'draft', googleBusinessEligible: false, address: { town: 'Wimbledon', county: 'London', country: 'GB' }, cutoffTime: '13:00', pickupInstructions: 'Partner collection point details will be confirmed when the order is ready. This is not a Holo Print branch.', customerFacingDescription: 'Customers in Wimbledon can order print online from Holo Print and collect from an approved partner point when the collection network is active. This page must not be presented as a Holo Print store.', partnerFeeMinor: 100, priority: 20, metadata: { collectionTruth: 'partner collection point, not a Holo Print branch' } },
  { id: 'loc-kingston', slug: 'kingston', name: 'Kingston', type: 'partner-collection-point', status: 'draft', googleBusinessEligible: false, address: { town: 'Kingston', county: 'London', country: 'GB' }, cutoffTime: '13:00', pickupInstructions: 'Partner collection point details will be confirmed when the order is ready. This is not a Holo Print branch.', customerFacingDescription: 'Customers in Kingston can order print online from Holo Print and collect from an approved partner point when available. The page should clearly describe partner collection, not a fake branch.', partnerFeeMinor: 100, priority: 30, metadata: { collectionTruth: 'partner collection point, not a Holo Print branch' } },
  { id: 'loc-croydon', slug: 'croydon', name: 'Croydon', type: 'service-area', status: 'draft', googleBusinessEligible: false, address: { town: 'Croydon', county: 'London', country: 'GB' }, pickupInstructions: 'Delivery or future collection options will be shown at checkout where available.', customerFacingDescription: 'Holo Print can support customers in Croydon through online ordering, artwork upload, quote approval, payment links and delivery or future collection options.', priority: 40, metadata: { collectionTruth: 'service area page, not a Holo Print branch' } },
  { id: 'loc-bromley', slug: 'bromley', name: 'Bromley', type: 'service-area', status: 'draft', googleBusinessEligible: false, address: { town: 'Bromley', county: 'London', country: 'GB' }, pickupInstructions: 'Delivery or future collection options will be shown at checkout where available.', customerFacingDescription: 'Holo Print can support customers in Bromley through online ordering, artwork upload, quote approval, payment links and delivery or future collection options.', priority: 50, metadata: { collectionTruth: 'service area page, not a Holo Print branch' } },
  { id: 'loc-sutton', slug: 'sutton', name: 'Sutton', type: 'service-area', status: 'draft', googleBusinessEligible: false, address: { town: 'Sutton', county: 'London', country: 'GB' }, pickupInstructions: 'Delivery or future collection options will be shown at checkout where available.', customerFacingDescription: 'Holo Print can support customers in Sutton through online ordering, artwork upload, quote approval, payment links and delivery or future collection options.', priority: 60, metadata: { collectionTruth: 'service area page, not a Holo Print branch' } },
];

async function syncLocationSeo(request: Request, location: FulfilmentLocationRecord) {
  if (!location.seoPageEnabled) return null;
  const page: SeoPageRecord = {
    id: `seo-${location.slug}-${location.type}`,
    slug: `${location.type}-${location.slug}`,
    path: location.seo.path,
    pageType: location.type === 'partner-collection-point' ? 'collection-point' : location.type === 'service-area' ? 'service-area' : 'location',
    status: location.status === 'active' ? 'published' : 'draft',
    title: location.seo.title,
    metaDescription: location.seo.metaDescription,
    h1: location.seo.h1,
    canonicalUrl: `${SITE_URL}${location.seo.path}`,
    noIndex: location.status === 'hidden',
    noFollow: false,
    includeInSitemap: location.publicPageEnabled && location.status !== 'hidden',
    schemaTypes: location.seo.schemaTypes as any,
    targetKeyword: location.seo.targetKeyword,
    locationName: location.name,
    productName: '',
    templateKey: location.type,
    introCopy: location.customerFacingDescription,
    faqItems: [
      { question: `Can I collect print orders in ${location.name}?`, answer: location.type === 'main-store' || location.type === 'owned-branch' ? `Yes. ${location.name} is available as a Holo Print collection location.` : location.type === 'partner-collection-point' ? `Collection in ${location.name} is through an approved partner point where available, not a fake Holo Print branch.` : `${location.name} is currently treated as a service area. Delivery or future collection options will show at checkout when available.` },
      { question: 'When is my order ready?', answer: 'Ready time depends on payment, artwork approval, product type, cutoff time and production schedule.' },
      { question: 'What do I need for collection?', answer: location.pickupInstructions },
    ],
    internalLinks: [{ label: 'All products', href: '/all-products' }, { label: 'Artwork guide', href: '/artwork-guide' }, { label: 'Request quote', href: '/bespoke-quote' }],
    metadata: { ...location.metadata, googleBusinessEligible: location.googleBusinessEligible, locationType: location.type, address: location.address, openingHoursSpecification: location.openingHours.map((row) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: row.day, opens: row.open, closes: row.close })) },
  };
  return saveSeoPage(request, page);
}

export async function listFulfilmentLocations(request: Request, filters: { status?: string; type?: string; search?: string; publicOnly?: boolean } = {}) {
  const ctx = tenantContextFromRequest(request);
  const rows = await (prisma as any).coreCatalogRecord.findMany({ where: { tenantId: ctx.tenantId, resource: RESOURCE }, orderBy: [{ metadataJson: 'asc' }, { updatedAt: 'desc' }] }).catch(async () => (prisma as any).coreCatalogRecord.findMany({ where: { tenantId: ctx.tenantId, resource: RESOURCE }, orderBy: { updatedAt: 'desc' } }));
  let items = rows.map(toRecord).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
  if (filters.status && filters.status !== 'all') items = items.filter((item) => item.status === filters.status);
  if (filters.type && filters.type !== 'all') items = items.filter((item) => item.type === filters.type);
  if (filters.publicOnly) items = items.filter((item) => item.publicPageEnabled && item.status === 'active');
  const q = String(filters.search || '').toLowerCase().trim();
  if (q) items = items.filter((item) => [item.name, item.slug, item.address?.town, item.address?.postcode, item.type].join(' ').toLowerCase().includes(q));
  const summary = { total: items.length, active: items.filter((i) => i.status === 'active').length, draft: items.filter((i) => i.status === 'draft').length, partner: items.filter((i) => i.type === 'partner-collection-point').length, serviceArea: items.filter((i) => i.type === 'service-area').length, seoEnabled: items.filter((i) => i.seoPageEnabled).length, errors: items.reduce((sum, i) => sum + (i.readiness?.errors?.length || 0), 0), warnings: items.reduce((sum, i) => sum + (i.readiness?.warnings?.length || 0), 0) };
  return { items, summary, resource: RESOURCE };
}

export async function saveFulfilmentLocation(request: Request, input: Partial<FulfilmentLocationRecord>) {
  const ctx = tenantContextFromRequest(request);
  const location = normalise(input);
  const saved = await (prisma as any).coreCatalogRecord.upsert({
    where: { tenantId_resource_slug: { tenantId: ctx.tenantId, resource: RESOURCE, slug: location.slug } },
    update: { name: location.name, description: location.customerFacingDescription, metadataJson: toMetadata(location) },
    create: { id: location.id, tenantId: ctx.tenantId, resource: RESOURCE, slug: location.slug, name: location.name, description: location.customerFacingDescription, metadataJson: toMetadata(location) },
  });
  const item = toRecord(saved);
  const seoPage = await syncLocationSeo(request, item).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'SEO sync failed.' }));
  return { item, seoPage };
}

export async function seedFulfilmentLocations(request: Request) {
  const saved = [];
  for (const location of defaultFulfilmentLocations) saved.push(await saveFulfilmentLocation(request, location));
  return saved;
}
