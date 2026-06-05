import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { holoPrintLaunchProducts } from '@/data/holo-print-launch-catalogue';
import { saveSeoPage, type SeoPageRecord, type SeoPageType, type SeoSchemaType } from './seo-engine.service';

export type SeoTemplateKey = 'product' | 'location' | 'collection-point' | 'product-location' | 'service-area' | 'guide';

type TemplateContext = {
  Product?: string;
  ProductSlug?: string;
  Category?: string;
  Location?: string;
  LocationSlug?: string;
  AreaType?: string;
  Brand?: string;
  SiteUrl?: string;
  CollectionTruth?: string;
};

type SeoTemplateDefinition = {
  key: SeoTemplateKey;
  label: string;
  pageType: SeoPageType;
  title: string;
  metaDescription: string;
  h1: string;
  path: string;
  targetKeyword: string;
  introCopy: string;
  schemaTypes: SeoSchemaType[];
  includeInSitemap: boolean;
  defaultStatus: 'draft' | 'published';
  notes: string;
};

const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk').replace(/\/$/, '');
const BRAND = 'Holo Print';
const TEMPLATE_RESOURCE = 'seo-templates';

const DEFAULT_LOCATIONS = [
  { name: 'Sidcup', slug: 'sidcup', type: 'owned-store', publicPage: true, seoPage: true, googleBusinessEligible: true, collectionTruth: 'Holo Print store and production base' },
  { name: 'Wimbledon', slug: 'wimbledon', type: 'partner-collection', publicPage: true, seoPage: true, googleBusinessEligible: false, collectionTruth: 'partner collection point, not a Holo Print branch' },
  { name: 'Kingston', slug: 'kingston', type: 'partner-collection', publicPage: true, seoPage: true, googleBusinessEligible: false, collectionTruth: 'partner collection point, not a Holo Print branch' },
  { name: 'Croydon', slug: 'croydon', type: 'service-area', publicPage: true, seoPage: true, googleBusinessEligible: false, collectionTruth: 'service area page, not a Holo Print branch' },
  { name: 'Bromley', slug: 'bromley', type: 'service-area', publicPage: true, seoPage: true, googleBusinessEligible: false, collectionTruth: 'service area page, not a Holo Print branch' },
  { name: 'Sutton', slug: 'sutton', type: 'service-area', publicPage: true, seoPage: true, googleBusinessEligible: false, collectionTruth: 'service area page, not a Holo Print branch' },
];

const DEFAULT_GUIDES = [
  { name: 'Artwork Guide', slug: 'artwork-guide', keyword: 'print artwork guide', intro: 'Prepare artwork correctly before ordering print. This guide covers PDF, bleed, CMYK, resolution, fonts and cut-line basics for Holo Print customers.' },
  { name: 'Business Card Artwork Guide', slug: 'business-card-artwork-guide', keyword: 'business card artwork guide', intro: 'Set up business card artwork with correct size, bleed, safe area, CMYK colour and print-ready PDF export before uploading to Holo Print.' },
  { name: 'Banner Artwork Guide', slug: 'banner-artwork-guide', keyword: 'banner artwork guide', intro: 'Prepare PVC banner artwork with correct scale, resolution, bleed, eyelet-safe margins and readable text for outdoor display print.' },
];

export const defaultSeoTemplates: SeoTemplateDefinition[] = [
  {
    key: 'product', label: 'Product page', pageType: 'product', defaultStatus: 'draft', includeInSitemap: true,
    title: '{Product} Printing | Order Online | {Brand}',
    metaDescription: 'Order {Product} online from {Brand}. Upload artwork, choose options, request design help and get local print support from Sidcup.',
    h1: '{Product} printing from {Brand}',
    path: '/{ProductSlug}',
    targetKeyword: '{Product} printing',
    introCopy: '{Product} from {Brand} is built for local businesses, events, trades and everyday customers who need reliable print, artwork support and clear checkout options.',
    schemaTypes: ['Product', 'BreadcrumbList', 'FAQPage', 'WebPage'],
    notes: 'Core product SEO page template.',
  },
  {
    key: 'product-location', label: 'Product + location page', pageType: 'product-location', defaultStatus: 'draft', includeInSitemap: true,
    title: '{Product} in {Location} | Order Online & Collect Locally | {Brand}',
    metaDescription: 'Order {Product} in {Location} with {Brand}. Upload artwork online, request design help, choose delivery or local collection where available.',
    h1: '{Product} in {Location}',
    path: '/{ProductSlug}/{LocationSlug}',
    targetKeyword: '{Product} {Location}',
    introCopy: '{Brand} helps customers in {Location} order {Product} online with clear artwork upload, quote support, payment options and honest local collection or delivery information.',
    schemaTypes: ['Product', 'BreadcrumbList', 'FAQPage', 'WebPage'],
    notes: 'High-value local SEO page. Must be unique and useful, not a thin duplicate.',
  },
  {
    key: 'location', label: 'Owned store location page', pageType: 'location', defaultStatus: 'draft', includeInSitemap: true,
    title: 'Printing in {Location} | Local Print Shop | {Brand}',
    metaDescription: '{Brand} provides local printing in {Location}: business cards, flyers, banners, posters, stickers, signage, booklets, artwork help and collection options.',
    h1: 'Printing in {Location}',
    path: '/locations/{LocationSlug}',
    targetKeyword: 'printing in {Location}',
    introCopy: '{Brand} supports customers in {Location} with design, print, signage and web support. Use this page for genuine owned store/service information only.',
    schemaTypes: ['LocalBusiness', 'Organization', 'BreadcrumbList', 'FAQPage', 'WebPage'],
    notes: 'Only for real Holo Print branches or staffed stores eligible for Google Business Profile.',
  },
  {
    key: 'collection-point', label: 'Partner collection point page', pageType: 'collection-point', defaultStatus: 'draft', includeInSitemap: true,
    title: 'Print Collection {Location} | Order Online, Collect Locally | {Brand}',
    metaDescription: 'Order print online from {Brand} and collect in {Location} from an approved partner collection point where available. Honest local collection, not a fake branch.',
    h1: 'Print collection in {Location}',
    path: '/print-collection/{LocationSlug}',
    targetKeyword: 'print collection {Location}',
    introCopy: 'Customers in {Location} can order online with {Brand} and collect from an approved partner collection point where available. This is a collection option, not a fake Holo Print branch.',
    schemaTypes: ['CollectionPage', 'BreadcrumbList', 'FAQPage', 'WebPage'],
    notes: 'Never use LocalBusiness schema unless it is a real staffed Holo Print branch.',
  },
  {
    key: 'service-area', label: 'Service area page', pageType: 'service-area', defaultStatus: 'draft', includeInSitemap: true,
    title: 'Printing for {Location} | Online Print & Delivery | {Brand}',
    metaDescription: '{Brand} supports customers in {Location} with online print ordering, artwork upload, quotes, delivery and future collection options.',
    h1: 'Printing for customers in {Location}',
    path: '/printing/{LocationSlug}',
    targetKeyword: 'printing {Location}',
    introCopy: '{Brand} can support customers in {Location} through online ordering, artwork upload, quote approval, payment links and delivery or future collection options.',
    schemaTypes: ['Service', 'BreadcrumbList', 'FAQPage', 'WebPage'],
    notes: 'Service area page. Do not pretend there is a physical Holo Print branch.',
  },
  {
    key: 'guide', label: 'Guide page', pageType: 'guide', defaultStatus: 'draft', includeInSitemap: true,
    title: '{Product} | Helpful Print Guide | {Brand}',
    metaDescription: 'Read the {Product} guide from {Brand}. Learn how to prepare artwork, choose print options and avoid delays before ordering.',
    h1: '{Product}',
    path: '/guides/{ProductSlug}',
    targetKeyword: '{Product}',
    introCopy: '{Product} from {Brand}. This guide gives customers practical print, artwork and ordering advice before checkout.',
    schemaTypes: ['FAQPage', 'BreadcrumbList', 'WebPage'],
    notes: 'Evergreen guide template for artwork and product education.',
  },
];

function slugify(value: string) {
  return String(value || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
}

function render(template: string, context: TemplateContext) {
  return template.replace(/\{([A-Za-z]+)\}/g, (_, key) => String((context as any)[key] ?? ''));
}

function canonical(path: string) {
  return `${SITE_URL}${path === '/' ? '' : path}`;
}

function productFaq(product: string, location?: string) {
  const where = location ? ` in ${location}` : '';
  return [
    { question: `Can I order ${product}${where} online?`, answer: `Yes. You can order ${product} online with Holo Print, upload artwork, request design help or ask for a quote when the specification needs review.` },
    { question: `Can I collect ${product}${where}?`, answer: location ? `Collection options for ${location} depend on whether it is an owned Holo Print store, approved partner collection point or service area. Checkout will show available options honestly.` : 'Collection options are shown at checkout when available.' },
    { question: 'What artwork do I need?', answer: 'Print-ready PDF is preferred. Add bleed where needed, use CMYK colour and keep important text away from trim edges.' },
    { question: 'Can Holo Print help with design?', answer: 'Yes. You can request design or artwork help during the quote/order process.' },
  ];
}

function localLinks(productSlug?: string, locationSlug?: string) {
  const links = [
    { label: 'All products', href: '/all-products' },
    { label: 'Artwork guide', href: '/artwork-guide' },
    { label: 'Request a quote', href: '/bespoke-quote' },
  ];
  if (productSlug) links.unshift({ label: 'Order product', href: `/${productSlug}` });
  if (locationSlug) links.push({ label: 'Collection options', href: `/print-collection/${locationSlug}` });
  return links;
}

function contextForProduct(product: any): TemplateContext {
  const name = product.title || product.name || product.slug || 'Print';
  return { Product: name, ProductSlug: product.slug || slugify(name), Category: product.categoryName || product.categorySlug || product.categoryId || 'Print', Brand: BRAND, SiteUrl: SITE_URL };
}

function contextForLocation(location: any): TemplateContext {
  return { Location: location.name, LocationSlug: location.slug || slugify(location.name), AreaType: location.type, Brand: BRAND, SiteUrl: SITE_URL, CollectionTruth: location.collectionTruth };
}

function buildFromTemplate(template: SeoTemplateDefinition, context: TemplateContext, extra: Partial<SeoPageRecord> = {}): SeoPageRecord {
  const path = render(template.path, context).replace(/\/+/g, '/');
  const product = context.Product || extra.productName || '';
  const location = context.Location || extra.locationName || '';
  const title = extra.title || render(template.title, context);
  const metaDescription = extra.metaDescription || render(template.metaDescription, context);
  const h1 = extra.h1 || render(template.h1, context);
  const targetKeyword = extra.targetKeyword || render(template.targetKeyword, context);
  const introCopy = extra.introCopy || render(template.introCopy, context);
  return {
    id: `seo-${slugify(path)}`,
    slug: slugify(path),
    path,
    pageType: template.pageType,
    status: extra.status || template.defaultStatus,
    title,
    metaDescription,
    h1,
    canonicalUrl: canonical(path),
    noIndex: Boolean(extra.noIndex),
    noFollow: Boolean(extra.noFollow),
    includeInSitemap: extra.includeInSitemap ?? template.includeInSitemap,
    schemaTypes: extra.schemaTypes || template.schemaTypes,
    targetKeyword,
    productName: product,
    locationName: location,
    templateKey: template.key,
    introCopy,
    faqItems: extra.faqItems || productFaq(product || 'print', location || undefined),
    internalLinks: extra.internalLinks || localLinks(context.ProductSlug, context.LocationSlug),
    metadata: {
      generatedBy: 'build-54-seo-template-engine',
      templateLabel: template.label,
      templateNotes: template.notes,
      category: context.Category || '',
      areaType: context.AreaType || '',
      collectionTruth: context.CollectionTruth || '',
      googleBusinessEligible: extra.metadata?.googleBusinessEligible ?? true,
      ...(extra.metadata || {}),
    },
  };
}

async function liveProducts(tenantId: string) {
  const rows = await (prisma as any).product.findMany({ where: { tenantId, isActive: true }, include: { category: true }, orderBy: { updatedAt: 'desc' }, take: 50 }).catch(() => []);
  if (rows.length) return rows.map((row: any) => ({ id: row.id, slug: row.slug, title: row.title, name: row.title, categoryName: row.category?.name || '', categorySlug: row.category?.slug || '' }));
  return holoPrintLaunchProducts.map((product) => ({ id: product.id, slug: product.slug, title: product.title || product.name, name: product.name, categorySlug: product.categorySlug }));
}

export async function listSeoTemplates(request: Request) {
  const ctx = tenantContextFromRequest(request);
  const savedRows = await (prisma as any).coreCatalogRecord.findMany({ where: { tenantId: ctx.tenantId, resource: TEMPLATE_RESOURCE }, orderBy: { slug: 'asc' } }).catch(() => []);
  const saved = savedRows.map((row: any) => ({ id: row.id, slug: row.slug, name: row.name, description: row.description, ...(row.metadataJson || {}) }));
  return { templates: saved.length ? saved : defaultSeoTemplates, savedCount: saved.length, defaultCount: defaultSeoTemplates.length };
}

export async function seedSeoTemplates(request: Request) {
  const ctx = tenantContextFromRequest(request);
  const saved = [];
  for (const template of defaultSeoTemplates) {
    const row = await (prisma as any).coreCatalogRecord.upsert({
      where: { tenantId_resource_slug: { tenantId: ctx.tenantId, resource: TEMPLATE_RESOURCE, slug: template.key } },
      update: { name: template.label, description: template.notes, metadataJson: template },
      create: { id: `seo-template-${template.key}`, tenantId: ctx.tenantId, resource: TEMPLATE_RESOURCE, slug: template.key, name: template.label, description: template.notes, metadataJson: template },
    });
    saved.push(row.metadataJson || template);
  }
  return saved;
}

export async function previewSeoTemplate(request: Request, key: SeoTemplateKey = 'product-location') {
  const ctx = tenantContextFromRequest(request);
  const products = await liveProducts(ctx.tenantId);
  const product = products[0] || { title: 'Business Cards', slug: 'business-cards' };
  const location = DEFAULT_LOCATIONS[0];
  const template = defaultSeoTemplates.find((item) => item.key === key) || defaultSeoTemplates[1];
  const context = { ...contextForProduct(product), ...contextForLocation(location) };
  return buildFromTemplate(template, context, { metadata: { googleBusinessEligible: location.googleBusinessEligible } });
}

export async function generateSeoPagesFromTemplates(request: Request, options: { publish?: boolean; productLimit?: number; locationLimit?: number; keys?: SeoTemplateKey[] } = {}) {
  const ctx = tenantContextFromRequest(request);
  const products = (await liveProducts(ctx.tenantId)).slice(0, Math.max(1, Math.min(Number(options.productLimit || 8), 25)));
  const locations = DEFAULT_LOCATIONS.slice(0, Math.max(1, Math.min(Number(options.locationLimit || DEFAULT_LOCATIONS.length), DEFAULT_LOCATIONS.length)));
  const keys = options.keys?.length ? options.keys : ['product', 'product-location', 'location', 'collection-point', 'service-area', 'guide'];
  const pages: SeoPageRecord[] = [];

  for (const product of products) {
    const productContext = contextForProduct(product);
    if (keys.includes('product')) pages.push(buildFromTemplate(defaultSeoTemplates[0], productContext, { status: options.publish ? 'published' : 'draft' }));
    if (keys.includes('product-location')) {
      for (const location of locations) {
        const locationContext = contextForLocation(location);
        pages.push(buildFromTemplate(defaultSeoTemplates[1], { ...productContext, ...locationContext }, { status: options.publish ? 'published' : 'draft', metadata: { googleBusinessEligible: location.googleBusinessEligible, locationType: location.type } }));
      }
    }
  }

  for (const location of locations) {
    const locationContext = contextForLocation(location);
    if (keys.includes('location') && location.type === 'owned-store') pages.push(buildFromTemplate(defaultSeoTemplates[2], locationContext, { status: options.publish ? 'published' : 'draft', metadata: { googleBusinessEligible: true, locationType: location.type } }));
    if (keys.includes('collection-point') && location.type === 'partner-collection') pages.push(buildFromTemplate(defaultSeoTemplates[3], locationContext, { status: options.publish ? 'published' : 'draft', metadata: { googleBusinessEligible: false, locationType: location.type } }));
    if (keys.includes('service-area') && location.type === 'service-area') pages.push(buildFromTemplate(defaultSeoTemplates[4], locationContext, { status: options.publish ? 'published' : 'draft', metadata: { googleBusinessEligible: false, locationType: location.type } }));
  }

  if (keys.includes('guide')) {
    for (const guide of DEFAULT_GUIDES) {
      pages.push(buildFromTemplate(defaultSeoTemplates[5], { Product: guide.name, ProductSlug: guide.slug, Brand: BRAND, SiteUrl: SITE_URL }, { status: options.publish ? 'published' : 'draft', targetKeyword: guide.keyword, introCopy: guide.intro, metadata: { guide: true } }));
    }
  }

  const saved = [];
  for (const page of pages) saved.push(await saveSeoPage(request, page));
  return { saved, count: saved.length, products: products.length, locations: locations.length, keys };
}
