import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

export type SeoPageType = 'home' | 'product' | 'category' | 'location' | 'collection-point' | 'product-location' | 'guide' | 'static' | 'service-area';
export type SeoPageStatus = 'draft' | 'published' | 'hidden';
export type SeoSchemaType = 'Organization' | 'LocalBusiness' | 'Product' | 'BreadcrumbList' | 'FAQPage' | 'WebPage' | 'CollectionPage' | 'Service' | 'None';
export type SeoTwitterCard = 'summary' | 'summary_large_image';

export type SeoPageRecord = {
  id: string;
  slug: string;
  path: string;
  pageType: SeoPageType;
  status: SeoPageStatus;
  title: string;
  metaDescription: string;
  h1: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
  includeInSitemap: boolean;
  schemaTypes: SeoSchemaType[];
  targetKeyword: string;
  locationName?: string;
  productName?: string;
  templateKey?: string;
  introCopy?: string;
  faqItems?: Array<{ question: string; answer: string }>;
  internalLinks?: Array<{ label: string; href: string }>;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCard?: SeoTwitterCard;
  qualityScore?: number;
  readabilityScore?: number;
  readabilityWarnings?: string[];
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, any>;
  updatedAt?: string;
  createdAt?: string;
};

const RESOURCE = 'seo-pages';
const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk').replace(/\/$/, '');
const DEFAULT_OG_IMAGE = process.env.SEO_DEFAULT_OG_IMAGE || `${SITE_URL}/og-image.jpg`;

function now() { return new Date().toISOString(); }
function slugify(value: string) { return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'seo-page'; }
function cleanPath(value: string) { const path = String(value || '').trim() || '/'; return path.startsWith('/') ? path : `/${path}`; }
function canonical(path: string) { return `${SITE_URL}${cleanPath(path) === '/' ? '' : cleanPath(path)}`; }
function words(value: string) { return String(value || '').trim().split(/\s+/).filter(Boolean); }
function lowerIncludes(haystack: string, needle: string) { return String(haystack || '').toLowerCase().includes(String(needle || '').toLowerCase()); }

function defaultFaq(product = 'print', location = 'Sidcup') {
  return [
    { question: `Can I order ${product} online for ${location}?`, answer: `Yes. You can order online, upload artwork, request a quote, or choose payment once the job is confirmed.` },
    { question: 'Can I upload artwork later?', answer: 'Yes. You can upload artwork during checkout or provide it after placing the order.' },
    { question: 'Do custom jobs need approval?', answer: 'Custom sizes, signage, design work and complex artwork may need manual approval before payment and production.' },
  ];
}

export const defaultSeoPages: SeoPageRecord[] = [
  {
    id: 'seo-home', slug: 'home', path: '/', pageType: 'home', status: 'published',
    title: 'Holo Print | Design, Print, Sign and Web in Sidcup',
    metaDescription: 'Holo Print offers business cards, flyers, leaflets, posters, banners, stickers, shop boards, booklets, design support and local print services in Sidcup.',
    h1: 'Design, print, sign and web support in Sidcup', canonicalUrl: canonical('/'), noIndex: false, noFollow: false, includeInSitemap: true,
    schemaTypes: ['Organization', 'WebPage'], targetKeyword: 'printing in Sidcup', locationName: 'Sidcup', introCopy: 'Order print online, upload artwork and get local support from Holo Print.', faqItems: defaultFaq('printing', 'Sidcup'), internalLinks: [{ label: 'All products', href: '/all-products' }, { label: 'Contact', href: '/contact' }],
  },
  {
    id: 'seo-contact', slug: 'contact', path: '/contact', pageType: 'static', status: 'published',
    title: 'Contact Holo Print | Printing in Sidcup', metaDescription: 'Contact Holo Print for business cards, flyers, leaflets, banners, signage, stickers, booklets and artwork help in Sidcup.',
    h1: 'Contact Holo Print in Sidcup', canonicalUrl: canonical('/contact'), noIndex: false, noFollow: false, includeInSitemap: true,
    schemaTypes: ['Organization', 'WebPage'], targetKeyword: 'contact Holo Print', locationName: 'Sidcup', introCopy: 'Speak to Holo Print about local printing, quotes, artwork and collection.', faqItems: defaultFaq('printing', 'Sidcup'), internalLinks: [{ label: 'Request a quote', href: '/bespoke-quote' }],
  },
  {
    id: 'seo-business-cards-sidcup', slug: 'business-cards-sidcup', path: '/business-cards/sidcup', pageType: 'product-location', status: 'draft',
    title: 'Business Cards Sidcup | Order Online & Collect Locally | Holo Print', metaDescription: 'Order business cards in Sidcup with Holo Print. Upload artwork online, request design help and collect locally or choose delivery.',
    h1: 'Business cards in Sidcup', canonicalUrl: canonical('/business-cards/sidcup'), noIndex: false, noFollow: false, includeInSitemap: true,
    schemaTypes: ['Product', 'BreadcrumbList', 'FAQPage', 'WebPage'], targetKeyword: 'business cards Sidcup', productName: 'Business Cards', locationName: 'Sidcup', templateKey: 'product-location', introCopy: 'Business cards for local Sidcup businesses, startups, events and trades.', faqItems: defaultFaq('business cards', 'Sidcup'), internalLinks: [{ label: 'Business cards', href: '/business-cards' }, { label: 'Artwork guide', href: '/artwork-guide' }],
  },
  {
    id: 'seo-flyers-sidcup', slug: 'flyers-sidcup', path: '/flyers/sidcup', pageType: 'product-location', status: 'draft',
    title: 'Flyers & Leaflets Sidcup | Local Print & Collection | Holo Print', metaDescription: 'Print flyers and leaflets in Sidcup with online ordering, artwork upload, local collection and delivery options from Holo Print.',
    h1: 'Flyers and leaflets in Sidcup', canonicalUrl: canonical('/flyers/sidcup'), noIndex: false, noFollow: false, includeInSitemap: true,
    schemaTypes: ['Product', 'BreadcrumbList', 'FAQPage', 'WebPage'], targetKeyword: 'flyers Sidcup', productName: 'Flyers & Leaflets', locationName: 'Sidcup', templateKey: 'product-location', introCopy: 'Flyers and leaflets for local promotions, menus, events and business marketing.', faqItems: defaultFaq('flyers and leaflets', 'Sidcup'), internalLinks: [{ label: 'Flyers', href: '/flyers-leaflets' }, { label: 'Contact', href: '/contact' }],
  },
  {
    id: 'seo-print-collection-wimbledon', slug: 'print-collection-wimbledon', path: '/print-collection/wimbledon', pageType: 'collection-point', status: 'draft',
    title: 'Print Collection Wimbledon | Order Online, Collect Locally | Holo Print', metaDescription: 'Order print online from Holo Print and collect from a Wimbledon partner collection point when available. Honest local collection, not a fake branch.',
    h1: 'Print collection in Wimbledon', canonicalUrl: canonical('/print-collection/wimbledon'), noIndex: false, noFollow: false, includeInSitemap: true,
    schemaTypes: ['CollectionPage', 'FAQPage', 'WebPage'], targetKeyword: 'print collection Wimbledon', locationName: 'Wimbledon', templateKey: 'collection-point', introCopy: 'Order online and collect locally from an approved partner point when the collection network is active.', faqItems: defaultFaq('print orders', 'Wimbledon'), internalLinks: [{ label: 'Business cards', href: '/business-cards/wimbledon' }, { label: 'Contact', href: '/contact' }], metadata: { googleBusinessEligible: false, locationTruthRule: 'partner collection point, not Holo Print branch' },
  },
];

export function analyseSeoReadability(page: Pick<SeoPageRecord, 'introCopy' | 'metaDescription' | 'faqItems'>) {
  const faqText = (page.faqItems || []).map((item) => `${item.question}. ${item.answer}`).join(' ');
  const text = [page.introCopy, page.metaDescription, faqText].filter(Boolean).join('\n\n');
  const wordCount = words(text).length;
  const sentences = text.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  const sentenceCount = sentences.length || 1;
  const paragraphCount = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean).length || 1;
  const averageSentenceWords = Math.round((wordCount / sentenceCount) * 10) / 10;
  const transitionWords = ['also', 'because', 'however', 'therefore', 'so', 'then', 'first', 'finally', 'before', 'after', 'where', 'when', 'while', 'if', 'or', 'and'];
  const transitionWordMatches = words(text).filter((word) => transitionWords.includes(word.toLowerCase().replace(/[^a-z]/g, ''))).length;
  const warnings: string[] = [];
  if (wordCount < 80) warnings.push('Readability: add more useful body copy; aim for at least 80 words on SEO landing pages.');
  if (averageSentenceWords > 24) warnings.push(`Readability: average sentence length is ${averageSentenceWords} words; shorten long sentences.`);
  if (paragraphCount < 2 && wordCount > 120) warnings.push('Readability: split long copy into shorter paragraphs.');
  if (wordCount >= 80 && transitionWordMatches < 3) warnings.push('Readability: add more transition words so the copy flows naturally.');
  const score = Math.max(0, 100 - warnings.length * 18 - (wordCount < 50 ? 20 : 0));
  return { score, warnings, wordCount, sentenceCount, paragraphCount, averageSentenceWords, transitionWordMatches };
}

export function auditSeoPage(page: SeoPageRecord) {
  const warnings: string[] = [];
  const errors: string[] = [];
  const titleLength = page.title?.length || 0;
  const descriptionLength = page.metaDescription?.length || 0;
  const keyword = page.targetKeyword || '';
  if (!page.title) errors.push('Missing SEO title.');
  if (titleLength && (titleLength < 35 || titleLength > 70)) warnings.push(`Title length is ${titleLength}; aim for 35–70 characters.`);
  if (!page.metaDescription) errors.push('Missing meta description.');
  if (descriptionLength && (descriptionLength < 90 || descriptionLength > 165)) warnings.push(`Meta description length is ${descriptionLength}; aim for 90–165 characters.`);
  if (!page.h1) errors.push('Missing H1.');
  if (!page.canonicalUrl) errors.push('Missing canonical URL.');
  if (page.includeInSitemap && page.noIndex) errors.push('Page cannot be both no-index and included in sitemap.');
  if (!keyword) warnings.push('Missing target keyword.');
  if (keyword && !lowerIncludes(page.title, keyword.split(' ')[0])) warnings.push('Target keyword is not clearly represented in the SEO title.');
  if (keyword && !lowerIncludes(page.metaDescription, keyword.split(' ')[0])) warnings.push('Target keyword is not clearly represented in the meta description.');
  if (!page.schemaTypes?.length || page.schemaTypes.includes('None')) warnings.push('No schema selected.');
  if ((page.pageType === 'location' || page.pageType === 'product-location' || page.pageType === 'collection-point') && !page.locationName) errors.push('Location SEO page is missing location name.');
  if (page.pageType === 'product-location' && !page.productName) errors.push('Product-location SEO page is missing product name.');
  if (page.pageType === 'collection-point' && page.schemaTypes.includes('LocalBusiness') && page.metadata?.googleBusinessEligible === false) errors.push('Partner collection points must not use LocalBusiness schema as fake Holo Print branches.');
  if (!page.introCopy || page.introCopy.length < 80) warnings.push('Intro copy is weak or missing; add useful local/product context.');
  if (!page.internalLinks?.length) warnings.push('Missing internal links.');
  if ((page.internalLinks?.length || 0) > 0 && (page.internalLinks?.length || 0) < 2) warnings.push('Add at least two useful internal links where possible.');
  if (!page.faqItems?.length) warnings.push('Missing FAQ block.');
  if (!page.ogImage && !page.twitterImage) warnings.push('No social sharing image set; storefront will use the default OG image.');
  const readability = analyseSeoReadability(page);
  warnings.push(...readability.warnings);
  const score = Math.max(0, Math.round(100 - errors.length * 20 - warnings.length * 5));
  return { errors, warnings, score, readability };
}

function socialDefaults(page: SeoPageRecord) {
  return {
    ogTitle: page.ogTitle || page.title,
    ogDescription: page.ogDescription || page.metaDescription,
    ogImage: page.ogImage || page.metadata?.image || DEFAULT_OG_IMAGE,
    twitterTitle: page.twitterTitle || page.ogTitle || page.title,
    twitterDescription: page.twitterDescription || page.ogDescription || page.metaDescription,
    twitterImage: page.twitterImage || page.ogImage || page.metadata?.image || DEFAULT_OG_IMAGE,
    twitterCard: page.twitterCard || 'summary_large_image' as SeoTwitterCard,
  };
}

function toRecord(item: any): SeoPageRecord {
  const meta = item.metadataJson || {};
  const base: SeoPageRecord = {
    id: item.id,
    slug: item.slug,
    path: meta.path || `/${item.slug}`,
    pageType: meta.pageType || 'static',
    status: meta.status || 'draft',
    title: meta.title || item.name || '',
    metaDescription: meta.metaDescription || item.description || '',
    h1: meta.h1 || meta.title || item.name || '',
    canonicalUrl: meta.canonicalUrl || canonical(meta.path || `/${item.slug}`),
    noIndex: Boolean(meta.noIndex),
    noFollow: Boolean(meta.noFollow),
    includeInSitemap: meta.includeInSitemap !== false,
    schemaTypes: Array.isArray(meta.schemaTypes) ? meta.schemaTypes : ['WebPage'],
    targetKeyword: meta.targetKeyword || '',
    locationName: meta.locationName || '',
    productName: meta.productName || '',
    templateKey: meta.templateKey || '',
    introCopy: meta.introCopy || '',
    faqItems: Array.isArray(meta.faqItems) ? meta.faqItems : [],
    internalLinks: Array.isArray(meta.internalLinks) ? meta.internalLinks : [],
    ogTitle: meta.ogTitle || '',
    ogDescription: meta.ogDescription || '',
    ogImage: meta.ogImage || '',
    twitterTitle: meta.twitterTitle || '',
    twitterDescription: meta.twitterDescription || '',
    twitterImage: meta.twitterImage || '',
    twitterCard: meta.twitterCard === 'summary' ? 'summary' : 'summary_large_image',
    metadata: meta.metadata || {},
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
  };
  const social = socialDefaults(base);
  const page = { ...base, ...social };
  const audit = auditSeoPage(page);
  return { ...page, qualityScore: audit.score, readabilityScore: audit.readability.score, readabilityWarnings: audit.readability.warnings, warnings: audit.warnings, errors: audit.errors };
}

function toMetadata(page: SeoPageRecord) {
  const withSocial = { ...page, ...socialDefaults(page) };
  const audit = auditSeoPage(withSocial);
  return {
    path: cleanPath(withSocial.path), pageType: withSocial.pageType, status: withSocial.status || 'draft', title: withSocial.title, metaDescription: withSocial.metaDescription, h1: withSocial.h1,
    canonicalUrl: withSocial.canonicalUrl || canonical(withSocial.path), noIndex: Boolean(withSocial.noIndex), noFollow: Boolean(withSocial.noFollow), includeInSitemap: withSocial.includeInSitemap !== false,
    schemaTypes: withSocial.schemaTypes?.length ? withSocial.schemaTypes : ['WebPage'], targetKeyword: withSocial.targetKeyword || '', locationName: withSocial.locationName || '', productName: withSocial.productName || '',
    templateKey: withSocial.templateKey || '', introCopy: withSocial.introCopy || '', faqItems: withSocial.faqItems || [], internalLinks: withSocial.internalLinks || [],
    ogTitle: withSocial.ogTitle || '', ogDescription: withSocial.ogDescription || '', ogImage: withSocial.ogImage || '',
    twitterTitle: withSocial.twitterTitle || '', twitterDescription: withSocial.twitterDescription || '', twitterImage: withSocial.twitterImage || '', twitterCard: withSocial.twitterCard || 'summary_large_image',
    metadata: withSocial.metadata || {}, audit,
  };
}

export async function listSeoPages(request: Request, filters: { status?: string; pageType?: string; search?: string } = {}) {
  const ctx = tenantContextFromRequest(request);
  const rows = await (prisma as any).coreCatalogRecord.findMany({ where: { tenantId: ctx.tenantId, resource: RESOURCE }, orderBy: [{ updatedAt: 'desc' }] });
  let items = rows.map(toRecord);
  if (filters.status && filters.status !== 'all') items = items.filter((item) => item.status === filters.status);
  if (filters.pageType && filters.pageType !== 'all') items = items.filter((item) => item.pageType === filters.pageType);
  const q = String(filters.search || '').trim().toLowerCase();
  if (q) items = items.filter((item) => [item.title, item.path, item.targetKeyword, item.locationName, item.productName].join(' ').toLowerCase().includes(q));
  const summary = {
    total: items.length,
    published: items.filter((item) => item.status === 'published').length,
    draft: items.filter((item) => item.status === 'draft').length,
    hidden: items.filter((item) => item.status === 'hidden').length,
    indexable: items.filter((item) => !item.noIndex && item.includeInSitemap).length,
    errors: items.reduce((sum, item) => sum + (item.errors?.length || 0), 0),
    warnings: items.reduce((sum, item) => sum + (item.warnings?.length || 0), 0),
    averageScore: items.length ? Math.round(items.reduce((sum, item) => sum + (item.qualityScore || 0), 0) / items.length) : 0,
    averageReadability: items.length ? Math.round(items.reduce((sum, item) => sum + (item.readabilityScore || 0), 0) / items.length) : 0,
  };
  return { items, summary, resource: RESOURCE };
}

export async function saveSeoPage(request: Request, input: Partial<SeoPageRecord>) {
  const ctx = tenantContextFromRequest(request);
  const path = cleanPath(input.path || `/${input.slug || input.id || 'seo-page'}`);
  const slug = slugify(input.slug || path);
  const page: SeoPageRecord = {
    id: String(input.id || `seo-${slug}`), slug, path, pageType: input.pageType || 'static', status: input.status || 'draft', title: input.title || '', metaDescription: input.metaDescription || '', h1: input.h1 || input.title || '', canonicalUrl: input.canonicalUrl || canonical(path), noIndex: Boolean(input.noIndex), noFollow: Boolean(input.noFollow), includeInSitemap: input.includeInSitemap !== false, schemaTypes: input.schemaTypes?.length ? input.schemaTypes : ['WebPage'], targetKeyword: input.targetKeyword || '', locationName: input.locationName || '', productName: input.productName || '', templateKey: input.templateKey || '', introCopy: input.introCopy || '', faqItems: input.faqItems || [], internalLinks: input.internalLinks || [], ogTitle: input.ogTitle || '', ogDescription: input.ogDescription || '', ogImage: input.ogImage || '', twitterTitle: input.twitterTitle || '', twitterDescription: input.twitterDescription || '', twitterImage: input.twitterImage || '', twitterCard: input.twitterCard || 'summary_large_image', metadata: input.metadata || {}, updatedAt: now(), createdAt: input.createdAt || now(),
  };
  const row = await (prisma as any).coreCatalogRecord.upsert({
    where: { tenantId_resource_slug: { tenantId: ctx.tenantId, resource: RESOURCE, slug } },
    update: { name: page.title || page.h1 || slug, description: page.metaDescription || '', metadataJson: toMetadata(page) },
    create: { id: page.id, tenantId: ctx.tenantId, resource: RESOURCE, slug, name: page.title || page.h1 || slug, description: page.metaDescription || '', metadataJson: toMetadata(page) },
  });
  return toRecord(row);
}

export async function seedSeoPages(request: Request) {
  const saved = [];
  for (const page of defaultSeoPages) saved.push(await saveSeoPage(request, page));
  return saved;
}

export async function deleteSeoPage(request: Request, idOrSlug: string) {
  const ctx = tenantContextFromRequest(request);
  const row = await (prisma as any).coreCatalogRecord.findFirst({ where: { tenantId: ctx.tenantId, resource: RESOURCE, OR: [{ id: idOrSlug }, { slug: idOrSlug }] } });
  if (!row) return { ok: true, deleted: 0 };
  await (prisma as any).coreCatalogRecord.delete({ where: { id: row.id } });
  return { ok: true, deleted: 1, item: toRecord(row) };
}

export async function getSitemapSeoPages(request: Request) {
  const data = await listSeoPages(request, { status: 'published' });
  return data.items.filter((item) => item.includeInSitemap && !item.noIndex).map((item) => ({ loc: item.canonicalUrl || canonical(item.path), path: item.path, lastmod: item.updatedAt || now(), priority: item.pageType === 'home' ? 1 : item.pageType === 'product-location' ? 0.8 : 0.7, changefreq: item.pageType === 'home' ? 'daily' : 'weekly' }));
}
