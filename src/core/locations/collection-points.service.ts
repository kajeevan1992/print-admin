import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { saveSeoPage, type SeoPageRecord } from '@/core/seo/seo-engine.service';

export type CollectionPointKind = 'owned-branch' | 'partner-collection' | 'service-area';
export type CollectionPointStatus = 'active' | 'inactive' | 'draft';
export type ProductAvailabilityMode = 'all-products' | 'selected-products' | 'excluded-products';

export type CollectionPointRecord = {
  id: string;
  slug: string;
  name: string;
  kind: CollectionPointKind;
  status: CollectionPointStatus;
  areaName: string;
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  postcode?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  openingHours?: Record<string, string>;
  collectionInstructions?: string;
  customerNotes?: string;
  partnerNotes?: string;
  checkoutEnabled: boolean;
  publicPageEnabled: boolean;
  googleBusinessEligible: boolean;
  productAvailabilityMode: ProductAvailabilityMode;
  productSlugs: string[];
  excludedProductSlugs: string[];
  seoPath: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

type CoreCatalogRow = {
  id: string;
  tenantId: string;
  resource: string;
  slug: string;
  name: string;
  description: string | null;
  metadataJson: any;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const RESOURCE = 'collection-points';

function now() { return new Date().toISOString(); }
function iso(value: Date | string | undefined) { return value ? new Date(value).toISOString() : now(); }
function slugify(value: string) { return String(value || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'collection-point'; }
function tenantSafeId(prefix: string, tenantId: string, slug: string) { return `${prefix}-${slugify(tenantId)}-${slugify(slug)}`.slice(0, 180); }
function parseJson(value: any) { if (!value) return {}; if (typeof value === 'string') { try { return JSON.parse(value); } catch { return {}; } } return value; }
function arr(value: unknown) { return Array.isArray(value) ? value.map(String).filter(Boolean) : []; }

function kindLabel(kind: CollectionPointKind) {
  if (kind === 'owned-branch') return 'Owned Holo Print branch';
  if (kind === 'partner-collection') return 'Partner collection point';
  return 'Service area';
}

function seoPathFor(item: Pick<CollectionPointRecord, 'kind' | 'slug'>) {
  if (item.kind === 'owned-branch') return `/locations/${item.slug}`;
  if (item.kind === 'service-area') return `/printing/${item.slug}`;
  return `/print-collection/${item.slug}`;
}

function defaultHours() {
  return { monday: '09:00-17:30', tuesday: '09:00-17:30', wednesday: '09:00-17:30', thursday: '09:00-17:30', friday: '09:00-17:30', saturday: '09:00-17:30', sunday: 'Closed' };
}

function normaliseKind(value: unknown): CollectionPointKind {
  const key = String(value || '').toLowerCase();
  if (key === 'owned-branch' || key === 'owned' || key === 'store') return 'owned-branch';
  if (key === 'service-area' || key === 'service') return 'service-area';
  return 'partner-collection';
}

function normaliseStatus(value: unknown): CollectionPointStatus {
  const key = String(value || '').toLowerCase();
  if (key === 'active') return 'active';
  if (key === 'inactive') return 'inactive';
  return 'draft';
}

function normaliseAvailability(value: unknown): ProductAvailabilityMode {
  const key = String(value || '').toLowerCase();
  if (key === 'selected-products') return 'selected-products';
  if (key === 'excluded-products') return 'excluded-products';
  return 'all-products';
}

async function ensureStorage() {
  await (prisma as any).$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CoreCatalogRecord" (
      "id" TEXT PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "resource" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "metadataJson" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await (prisma as any).$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "CoreCatalogRecord_tenantId_resource_slug_key" ON "CoreCatalogRecord" ("tenantId", "resource", "slug")');
  await (prisma as any).$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CoreCatalogRecord_tenantId_resource_idx" ON "CoreCatalogRecord" ("tenantId", "resource")');
}

function toRecord(row: CoreCatalogRow): CollectionPointRecord {
  const meta = parseJson(row.metadataJson);
  const kind = normaliseKind(meta.kind);
  const slug = row.slug || slugify(row.name);
  const record: CollectionPointRecord = {
    id: row.id,
    slug,
    name: row.name,
    kind,
    status: normaliseStatus(meta.status),
    areaName: meta.areaName || row.name,
    addressLine1: meta.addressLine1 || '',
    addressLine2: meta.addressLine2 || '',
    town: meta.town || '',
    postcode: meta.postcode || '',
    country: meta.country || 'United Kingdom',
    contactName: meta.contactName || '',
    contactEmail: meta.contactEmail || '',
    contactPhone: meta.contactPhone || '',
    openingHours: meta.openingHours && typeof meta.openingHours === 'object' ? meta.openingHours : defaultHours(),
    collectionInstructions: meta.collectionInstructions || row.description || '',
    customerNotes: meta.customerNotes || '',
    partnerNotes: meta.partnerNotes || '',
    checkoutEnabled: Boolean(meta.checkoutEnabled),
    publicPageEnabled: meta.publicPageEnabled !== false,
    googleBusinessEligible: kind === 'owned-branch' ? Boolean(meta.googleBusinessEligible ?? true) : false,
    productAvailabilityMode: normaliseAvailability(meta.productAvailabilityMode),
    productSlugs: arr(meta.productSlugs),
    excludedProductSlugs: arr(meta.excludedProductSlugs),
    seoPath: meta.seoPath || seoPathFor({ kind, slug }),
    sortOrder: Number(meta.sortOrder || 100),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
  return record;
}

function toMetadata(record: CollectionPointRecord) {
  return {
    kind: record.kind,
    status: record.status,
    areaName: record.areaName,
    addressLine1: record.addressLine1 || '',
    addressLine2: record.addressLine2 || '',
    town: record.town || '',
    postcode: record.postcode || '',
    country: record.country || 'United Kingdom',
    contactName: record.contactName || '',
    contactEmail: record.contactEmail || '',
    contactPhone: record.contactPhone || '',
    openingHours: record.openingHours || defaultHours(),
    collectionInstructions: record.collectionInstructions || '',
    customerNotes: record.customerNotes || '',
    partnerNotes: record.partnerNotes || '',
    checkoutEnabled: Boolean(record.checkoutEnabled),
    publicPageEnabled: record.publicPageEnabled !== false,
    googleBusinessEligible: Boolean(record.googleBusinessEligible),
    productAvailabilityMode: record.productAvailabilityMode || 'all-products',
    productSlugs: record.productSlugs || [],
    excludedProductSlugs: record.excludedProductSlugs || [],
    seoPath: record.seoPath || seoPathFor(record),
    sortOrder: Number(record.sortOrder || 100),
    kindLabel: kindLabel(record.kind),
  };
}

export function productAllowedAtCollectionPoint(point: CollectionPointRecord, productSlug?: string) {
  if (!point.checkoutEnabled || point.status !== 'active') return false;
  const slug = slugify(productSlug || '');
  if (!slug) return true;
  if (point.productAvailabilityMode === 'selected-products') return point.productSlugs.map(slugify).includes(slug);
  if (point.productAvailabilityMode === 'excluded-products') return !point.excludedProductSlugs.map(slugify).includes(slug);
  return true;
}

function toSeoPage(record: CollectionPointRecord): SeoPageRecord {
  const isOwned = record.kind === 'owned-branch';
  const isService = record.kind === 'service-area';
  const path = record.seoPath || seoPathFor(record);
  const locationPhrase = isService ? `customers in ${record.areaName}` : record.areaName;
  return {
    id: `seo-${slugify(path)}`,
    slug: slugify(path),
    path,
    pageType: isOwned ? 'location' : isService ? 'service-area' : 'collection-point',
    status: record.publicPageEnabled && record.status === 'active' ? 'published' : 'draft',
    title: isOwned ? `Printing in ${record.areaName} | Holo Print` : isService ? `Printing for ${record.areaName} | Holo Print` : `Print Collection ${record.areaName} | Holo Print`,
    metaDescription: isOwned
      ? `Visit or order online from Holo Print in ${record.areaName}. Business cards, flyers, posters, signage, booklets, artwork help, collection and delivery options.`
      : isService
        ? `Holo Print supports ${locationPhrase} with online print ordering, artwork upload, quotes, delivery and collection options where available.`
        : `Order print online from Holo Print and collect near ${record.areaName} when this approved partner collection point is available. This is not a fake branch listing.`,
    h1: isOwned ? `Printing in ${record.areaName}` : isService ? `Printing for ${record.areaName}` : `Print collection near ${record.areaName}`,
    canonicalUrl: '',
    noIndex: !record.publicPageEnabled || record.status !== 'active',
    noFollow: false,
    includeInSitemap: record.publicPageEnabled && record.status === 'active',
    schemaTypes: isOwned ? ['LocalBusiness', 'Organization', 'FAQPage', 'WebPage'] : isService ? ['Service', 'FAQPage', 'WebPage'] : ['CollectionPage', 'FAQPage', 'WebPage'],
    targetKeyword: isOwned ? `printing in ${record.areaName}` : isService ? `printing ${record.areaName}` : `print collection ${record.areaName}`,
    locationName: record.areaName,
    templateKey: 'collection-point-system',
    introCopy: isOwned
      ? `Holo Print supports customers in ${record.areaName} with local print advice, online ordering, artwork support, collection and delivery options. Use this page for genuine branch information only.`
      : isService
        ? `Holo Print can support customers in ${record.areaName} through online ordering, artwork upload, quote approval, payment links and delivery or future collection options. This is a service-area page, not a fake branch.`
        : `Customers near ${record.areaName} can order online with Holo Print and collect from an approved partner collection point where available. This page is for honest collection information only, not a staffed Holo Print branch claim.`,
    faqItems: [
      { question: `Can I collect print orders near ${record.areaName}?`, answer: record.checkoutEnabled ? 'Yes, this point can be offered at checkout when the order and product are eligible.' : 'This point is not currently enabled at checkout. Use delivery or another active collection option.' },
      { question: 'Is this a Holo Print branch?', answer: isOwned ? 'Yes, this is marked as an owned Holo Print branch.' : 'No. This is not marked as a staffed Holo Print branch.' },
      { question: 'Which products can be collected?', answer: record.productAvailabilityMode === 'selected-products' ? `Only selected products are enabled: ${record.productSlugs.join(', ')}.` : record.productAvailabilityMode === 'excluded-products' ? `Most products are enabled except: ${record.excludedProductSlugs.join(', ')}.` : 'All eligible products can use this collection point.' },
    ],
    internalLinks: [
      { label: 'All products', href: '/all-products' },
      { label: 'Request a quote', href: '/bespoke-quote' },
      { label: 'Upload artwork', href: '/artwork-upload' },
    ],
    metadata: {
      collectionPointId: record.id,
      collectionPointKind: record.kind,
      googleBusinessEligible: record.googleBusinessEligible,
      locationTruthRule: isOwned ? 'owned branch wording allowed' : record.kind === 'partner-collection' ? 'partner collection point only; not a Holo Print branch' : 'service-area wording only; not a Holo Print branch',
      checkoutEnabled: record.checkoutEnabled,
    },
  };
}

export async function listCollectionPoints(request: Request, filters: { search?: string; status?: string; kind?: string; checkoutOnly?: boolean; productSlug?: string } = {}) {
  await ensureStorage();
  const ctx = tenantContextFromRequest(request);
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    SELECT * FROM "CoreCatalogRecord"
    WHERE "tenantId" = ${ctx.tenantId} AND "resource" = ${RESOURCE}
    ORDER BY "metadataJson"->>'sortOrder' ASC, "updatedAt" DESC
  `;
  let items = rows.map(toRecord);
  if (filters.status && filters.status !== 'all') items = items.filter((item) => item.status === filters.status);
  if (filters.kind && filters.kind !== 'all') items = items.filter((item) => item.kind === filters.kind);
  if (filters.checkoutOnly) items = items.filter((item) => productAllowedAtCollectionPoint(item, filters.productSlug));
  const q = String(filters.search || '').trim().toLowerCase();
  if (q) items = items.filter((item) => [item.name, item.areaName, item.postcode, item.town, item.kind].join(' ').toLowerCase().includes(q));
  return {
    items,
    summary: {
      total: items.length,
      active: items.filter((item) => item.status === 'active').length,
      checkoutEnabled: items.filter((item) => item.checkoutEnabled && item.status === 'active').length,
      ownedBranches: items.filter((item) => item.kind === 'owned-branch').length,
      partnerPoints: items.filter((item) => item.kind === 'partner-collection').length,
      serviceAreas: items.filter((item) => item.kind === 'service-area').length,
    },
  };
}

export async function saveCollectionPoint(request: Request, input: Partial<CollectionPointRecord> = {}) {
  await ensureStorage();
  const ctx = tenantContextFromRequest(request);
  const name = String(input.name || input.areaName || 'Collection point').trim();
  const slug = slugify(input.slug || name);
  const kind = normaliseKind(input.kind);
  const record: CollectionPointRecord = {
    id: String(input.id || tenantSafeId('cp', ctx.tenantId, slug)),
    slug,
    name,
    kind,
    status: normaliseStatus(input.status),
    areaName: String(input.areaName || name).trim(),
    addressLine1: input.addressLine1 || '',
    addressLine2: input.addressLine2 || '',
    town: input.town || '',
    postcode: input.postcode || '',
    country: input.country || 'United Kingdom',
    contactName: input.contactName || '',
    contactEmail: input.contactEmail || '',
    contactPhone: input.contactPhone || '',
    openingHours: input.openingHours || defaultHours(),
    collectionInstructions: input.collectionInstructions || '',
    customerNotes: input.customerNotes || '',
    partnerNotes: input.partnerNotes || '',
    checkoutEnabled: Boolean(input.checkoutEnabled),
    publicPageEnabled: input.publicPageEnabled !== false,
    googleBusinessEligible: kind === 'owned-branch' ? Boolean(input.googleBusinessEligible ?? true) : false,
    productAvailabilityMode: normaliseAvailability(input.productAvailabilityMode),
    productSlugs: arr(input.productSlugs),
    excludedProductSlugs: arr(input.excludedProductSlugs),
    seoPath: input.seoPath || seoPathFor({ kind, slug }),
    sortOrder: Number(input.sortOrder || 100),
    createdAt: input.createdAt || now(),
    updatedAt: now(),
  };
  const metadataJson = JSON.stringify(toMetadata(record));
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    INSERT INTO "CoreCatalogRecord" ("id", "tenantId", "resource", "slug", "name", "description", "metadataJson", "createdAt", "updatedAt")
    VALUES (${record.id}, ${ctx.tenantId}, ${RESOURCE}, ${slug}, ${record.name}, ${record.collectionInstructions || ''}, ${metadataJson}::jsonb, NOW(), NOW())
    ON CONFLICT ("tenantId", "resource", "slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "metadataJson" = EXCLUDED."metadataJson",
      "updatedAt" = NOW()
    RETURNING *
  `;
  const saved = toRecord(rows[0]);
  if (saved.publicPageEnabled) await saveSeoPage(request, toSeoPage(saved));
  return saved;
}

export async function deleteCollectionPoint(request: Request, idOrSlug: string) {
  await ensureStorage();
  const ctx = tenantContextFromRequest(request);
  const slug = slugify(idOrSlug);
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    SELECT * FROM "CoreCatalogRecord"
    WHERE "tenantId" = ${ctx.tenantId} AND "resource" = ${RESOURCE} AND ("id" = ${idOrSlug} OR "slug" = ${slug})
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ok: true, deleted: 0 };
  await (prisma as any).$executeRaw`DELETE FROM "CoreCatalogRecord" WHERE "id" = ${row.id}`;
  return { ok: true, deleted: 1, item: toRecord(row) };
}

export async function seedCollectionPoints(request: Request) {
  const defaults: Partial<CollectionPointRecord>[] = [
    { name: 'Holo Print Sidcup', slug: 'sidcup', kind: 'owned-branch', status: 'active', areaName: 'Sidcup', addressLine1: 'Sidcup High Street', town: 'Sidcup', country: 'United Kingdom', checkoutEnabled: true, publicPageEnabled: true, googleBusinessEligible: true, collectionInstructions: 'Collect from the Holo Print store when your order is marked ready.', customerNotes: 'Bring your order confirmation when collecting.', productAvailabilityMode: 'all-products', sortOrder: 10 },
    { name: 'Wimbledon Partner Collection', slug: 'wimbledon', kind: 'partner-collection', status: 'draft', areaName: 'Wimbledon', checkoutEnabled: false, publicPageEnabled: true, googleBusinessEligible: false, collectionInstructions: 'Partner collection point wording only. Enable checkout after the partner agreement is active.', customerNotes: 'Collection becomes available after this partner point is activated.', productAvailabilityMode: 'all-products', sortOrder: 30 },
    { name: 'Kingston Partner Collection', slug: 'kingston', kind: 'partner-collection', status: 'draft', areaName: 'Kingston', checkoutEnabled: false, publicPageEnabled: true, googleBusinessEligible: false, collectionInstructions: 'Partner collection point wording only. Enable checkout after the partner agreement is active.', customerNotes: 'Collection becomes available after this partner point is activated.', productAvailabilityMode: 'all-products', sortOrder: 40 },
    { name: 'Bexley Service Area', slug: 'bexley', kind: 'service-area', status: 'draft', areaName: 'Bexley', checkoutEnabled: false, publicPageEnabled: true, googleBusinessEligible: false, collectionInstructions: 'Service-area page only. Do not describe as a Holo Print branch.', productAvailabilityMode: 'all-products', sortOrder: 60 },
  ];
  const saved = [];
  for (const item of defaults) saved.push(await saveCollectionPoint(request, item));
  return saved;
}
