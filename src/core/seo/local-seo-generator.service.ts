import { saveSeoPage, type SeoPageRecord, type SeoPageType } from './seo-engine.service';

export type LocalSeoProductInput = {
  name: string;
  slug?: string;
  singular?: string;
  category?: string;
  path?: string;
  keywords?: string[];
};

export type LocalSeoLocationInput = {
  name: string;
  slug?: string;
  areaType?: 'store-area' | 'service-area' | 'collection-point';
  isOwnedBranch?: boolean;
  collectionNote?: string;
};

export type LocalSeoGeneratorInput = {
  products?: LocalSeoProductInput[];
  locations?: LocalSeoLocationInput[];
  collectionPoints?: LocalSeoLocationInput[];
  status?: 'draft' | 'published' | 'hidden';
  includeInSitemap?: boolean;
  mode?: 'product-location' | 'service-area' | 'collection-points' | 'all';
  maxPages?: number;
};

const DEFAULT_PRODUCTS: LocalSeoProductInput[] = [
  { name: 'Business Cards', singular: 'business cards', slug: 'business-cards', category: 'Business stationery', path: '/standard-business-cards', keywords: ['business cards', 'same day business cards'] },
  { name: 'Flyers & Leaflets', singular: 'flyers and leaflets', slug: 'flyers', category: 'Marketing print', path: '/flyers', keywords: ['flyers', 'leaflets'] },
  { name: 'Posters', singular: 'poster printing', slug: 'posters', category: 'Large format', path: '/posters-large-format-prints', keywords: ['posters', 'large format prints'] },
  { name: 'Booklets & Brochures', singular: 'booklets and brochures', slug: 'booklets', category: 'Booklets', path: '/booklets', keywords: ['booklets', 'brochures'] },
  { name: 'PVC Banners', singular: 'PVC banners', slug: 'pvc-banners', category: 'Signage', path: '/all-products', keywords: ['PVC banners', 'banner printing'] },
  { name: 'Stickers & Labels', singular: 'stickers and labels', slug: 'stickers-labels', category: 'Labels', path: '/all-products', keywords: ['stickers', 'labels'] },
];

const DEFAULT_LOCATIONS: LocalSeoLocationInput[] = [
  { name: 'Sidcup', slug: 'sidcup', areaType: 'store-area', isOwnedBranch: true },
  { name: 'Bexley', slug: 'bexley', areaType: 'service-area' },
  { name: 'Welling', slug: 'welling', areaType: 'service-area' },
  { name: 'New Eltham', slug: 'new-eltham', areaType: 'service-area' },
  { name: 'Chislehurst', slug: 'chislehurst', areaType: 'service-area' },
  { name: 'Bexleyheath', slug: 'bexleyheath', areaType: 'service-area' },
];

const DEFAULT_COLLECTION_POINTS: LocalSeoLocationInput[] = [
  { name: 'Wimbledon', slug: 'wimbledon', areaType: 'collection-point', isOwnedBranch: false, collectionNote: 'Partner collection point wording only. Do not describe this as a staffed Holo Print branch unless ownership changes.' },
  { name: 'Kingston', slug: 'kingston', areaType: 'collection-point', isOwnedBranch: false, collectionNote: 'Partner collection point wording only. Do not describe this as a staffed Holo Print branch unless ownership changes.' },
  { name: 'Lewisham', slug: 'lewisham', areaType: 'collection-point', isOwnedBranch: false, collectionNote: 'Partner collection point wording only. Do not describe this as a staffed Holo Print branch unless ownership changes.' },
];

function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function productSlug(product: LocalSeoProductInput) {
  return product.slug || slugify(product.name);
}

function locationSlug(location: LocalSeoLocationInput) {
  return location.slug || slugify(location.name);
}

function titleCase(value: string) {
  return String(value || '').replace(/\b\w/g, (char) => char.toUpperCase());
}

function areaPhrase(location: LocalSeoLocationInput) {
  if (location.areaType === 'collection-point') return `near ${location.name}`;
  if (location.isOwnedBranch) return `in ${location.name}`;
  return `for ${location.name}`;
}

function defaultStatus(input?: LocalSeoGeneratorInput) {
  return input?.status || 'draft';
}

function defaultIncludeInSitemap(input?: LocalSeoGeneratorInput) {
  return Boolean(input?.includeInSitemap);
}

function productLocationPath(product: LocalSeoProductInput, location: LocalSeoLocationInput) {
  return `/${productSlug(product)}/${locationSlug(location)}`;
}

function serviceAreaPath(location: LocalSeoLocationInput) {
  return `/printing/${locationSlug(location)}`;
}

function collectionPointPath(location: LocalSeoLocationInput) {
  return `/print-collection/${locationSlug(location)}`;
}

function localIntro(product: LocalSeoProductInput, location: LocalSeoLocationInput) {
  const name = product.singular || product.name.toLowerCase();
  const localWording = location.isOwnedBranch
    ? `Holo Print supports local customers in ${location.name} with online ordering, artwork checks and collection or delivery options.`
    : `Holo Print can support customers around ${location.name} with online ordering, artwork checks and delivery or approved collection options where available.`;
  return [
    `Order ${name} ${areaPhrase(location)} with a clear online print journey from Holo Print. Choose your product, prepare or upload artwork, and get help if the specification needs manual checking before production.`,
    `${localWording} This page is written for customers searching for ${name} ${areaPhrase(location)}, while keeping location wording honest and avoiding fake branch claims.`,
    `For urgent jobs, unusual sizes, design support or bulk quantities, request a bespoke quote so the team can confirm production, turnaround, delivery and artwork requirements before payment.`
  ].join('\n\n');
}

function serviceAreaIntro(location: LocalSeoLocationInput) {
  return [
    `Holo Print provides design, print, sign and web support for customers ${areaPhrase(location)}. You can browse products online, request a quote, upload artwork and get help with sizes, material choices and turnaround before production.`,
    location.isOwnedBranch
      ? `${location.name} customers can use the online storefront or contact the local team for print advice, artwork checks, collection and delivery options.`
      : `This service-area page is for customers around ${location.name}. It should not be treated as a separate Holo Print branch unless a real staffed store is opened there.`,
    `Popular services include business cards, flyers, leaflets, posters, booklets, banners, stickers, labels, signage, menus, stationery and custom print projects.`
  ].join('\n\n');
}

function collectionIntro(location: LocalSeoLocationInput) {
  return [
    `Holo Print can support online print orders with local collection options near ${location.name} when an approved partner collection point is active. This page is designed to be honest: a partner collection point is not the same as a staffed Holo Print branch.`,
    `Customers can order print online, request artwork support, and choose collection or delivery options that are available for the job. For custom sizes, special finishes or urgent work, the team can confirm the best route before production.`,
    `Use this page to explain collection availability, order cut-off expectations and the difference between delivery, collection and any future Holo Print branch locations.`
  ].join('\n\n');
}

function productFaq(product: LocalSeoProductInput, location: LocalSeoLocationInput) {
  const item = product.singular || product.name.toLowerCase();
  return [
    { question: `Can I order ${item} ${areaPhrase(location)}?`, answer: `Yes. You can start online, upload artwork or request help, and choose collection or delivery options that are available for the order.` },
    { question: 'Can I get help with artwork?', answer: 'Yes. Holo Print can check artwork and help with design or file preparation before the job goes into production.' },
    { question: 'Are custom sizes and bulk quantities available?', answer: 'Yes. Use the bespoke quote route for custom specifications, unusual sizes, specialist materials, tight deadlines or larger quantities.' },
  ];
}

function serviceFaq(location: LocalSeoLocationInput) {
  return [
    { question: `Does Holo Print serve ${location.name}?`, answer: location.isOwnedBranch ? `Yes. Holo Print serves customers in ${location.name} with online ordering, artwork support, collection and delivery options.` : `Yes. Holo Print can support customers around ${location.name}, but this page should not be described as a separate branch unless one is opened there.` },
    { question: 'What print products can I order?', answer: 'You can order business cards, flyers, leaflets, posters, booklets, banners, stickers, labels, signage, menus, stationery and bespoke print jobs.' },
    { question: 'Can I collect my order locally?', answer: 'Collection depends on the active store or approved partner collection setup for your order. Delivery can also be offered where suitable.' },
  ];
}

function productLinks(product: LocalSeoProductInput) {
  return [
    { label: product.name, href: product.path || `/${productSlug(product)}` },
    { label: 'All products', href: '/all-products' },
    { label: 'Upload artwork', href: '/artwork-upload' },
    { label: 'Request a bespoke quote', href: '/bespoke-quote' },
  ];
}

function serviceLinks() {
  return [
    { label: 'Business cards', href: '/standard-business-cards' },
    { label: 'Flyers and leaflets', href: '/flyers' },
    { label: 'All print products', href: '/all-products' },
    { label: 'Request a quote', href: '/bespoke-quote' },
  ];
}

function productLocationPage(product: LocalSeoProductInput, location: LocalSeoLocationInput, input: LocalSeoGeneratorInput): SeoPageRecord {
  const pSlug = productSlug(product);
  const lSlug = locationSlug(location);
  const item = product.singular || product.name.toLowerCase();
  const path = productLocationPath(product, location);
  const targetKeyword = `${item} ${location.name}`;
  const title = `${titleCase(product.name)} ${location.name} | Order Online | Holo Print`;
  return {
    id: `seo-${pSlug}-${lSlug}`,
    slug: `${pSlug}-${lSlug}`,
    path,
    pageType: 'product-location',
    status: defaultStatus(input),
    title: title.length > 70 ? `${titleCase(product.name)} ${location.name} | Holo Print` : title,
    metaDescription: `Order ${item} ${areaPhrase(location)} with Holo Print. Upload artwork online, request design help, and choose suitable collection or delivery options.`,
    h1: `${titleCase(product.name)} ${areaPhrase(location)}`,
    canonicalUrl: '',
    noIndex: false,
    noFollow: false,
    includeInSitemap: defaultIncludeInSitemap(input),
    schemaTypes: ['Product', 'BreadcrumbList', 'FAQPage', 'WebPage'],
    targetKeyword,
    locationName: location.name,
    productName: product.name,
    templateKey: 'product-location',
    introCopy: localIntro(product, location),
    faqItems: productFaq(product, location),
    internalLinks: productLinks(product),
    twitterCard: 'summary_large_image',
    metadata: {
      generatedBy: 'build-38-local-seo-generator',
      category: product.category || '',
      sourceProductPath: product.path || '',
      areaType: location.areaType || 'service-area',
      isOwnedBranch: Boolean(location.isOwnedBranch),
      locationTruthRule: location.isOwnedBranch ? 'owned Holo Print area/store wording allowed' : 'service-area wording only; do not claim a staffed Holo Print branch',
    },
  };
}

function serviceAreaPage(location: LocalSeoLocationInput, input: LocalSeoGeneratorInput): SeoPageRecord {
  const lSlug = locationSlug(location);
  const path = serviceAreaPath(location);
  return {
    id: `seo-printing-${lSlug}`,
    slug: `printing-${lSlug}`,
    path,
    pageType: location.isOwnedBranch ? 'location' : 'service-area',
    status: defaultStatus(input),
    title: `Printing ${location.name} | Design, Print, Sign & Web | Holo Print`,
    metaDescription: `Holo Print provides business cards, flyers, posters, booklets, signage, stickers, labels, artwork support and custom print services ${areaPhrase(location)}.`,
    h1: `Printing ${areaPhrase(location)}`,
    canonicalUrl: '',
    noIndex: false,
    noFollow: false,
    includeInSitemap: defaultIncludeInSitemap(input),
    schemaTypes: location.isOwnedBranch ? ['LocalBusiness', 'WebPage', 'FAQPage'] : ['Service', 'WebPage', 'FAQPage'],
    targetKeyword: `printing ${location.name}`,
    locationName: location.name,
    templateKey: 'service-area',
    introCopy: serviceAreaIntro(location),
    faqItems: serviceFaq(location),
    internalLinks: serviceLinks(),
    twitterCard: 'summary_large_image',
    metadata: {
      generatedBy: 'build-38-local-seo-generator',
      areaType: location.areaType || 'service-area',
      isOwnedBranch: Boolean(location.isOwnedBranch),
      googleBusinessEligible: Boolean(location.isOwnedBranch),
      locationTruthRule: location.isOwnedBranch ? 'owned Holo Print location wording allowed' : 'service-area wording only; not a Holo Print branch',
    },
  };
}

function collectionPointPage(location: LocalSeoLocationInput, input: LocalSeoGeneratorInput): SeoPageRecord {
  const lSlug = locationSlug(location);
  const path = collectionPointPath(location);
  return {
    id: `seo-print-collection-${lSlug}`,
    slug: `print-collection-${lSlug}`,
    path,
    pageType: 'collection-point',
    status: defaultStatus(input),
    title: `Print Collection ${location.name} | Order Online | Holo Print`,
    metaDescription: `Order print online from Holo Print and use collection near ${location.name} when an approved partner collection point is available. Honest collection-point wording, not a fake branch.`,
    h1: `Print collection near ${location.name}`,
    canonicalUrl: '',
    noIndex: false,
    noFollow: false,
    includeInSitemap: defaultIncludeInSitemap(input),
    schemaTypes: ['CollectionPage', 'FAQPage', 'WebPage'],
    targetKeyword: `print collection ${location.name}`,
    locationName: location.name,
    templateKey: 'collection-point',
    introCopy: collectionIntro(location),
    faqItems: serviceFaq({ ...location, areaType: 'collection-point', isOwnedBranch: false }),
    internalLinks: serviceLinks(),
    twitterCard: 'summary_large_image',
    metadata: {
      generatedBy: 'build-38-local-seo-generator',
      areaType: 'collection-point',
      isOwnedBranch: false,
      googleBusinessEligible: false,
      collectionNote: location.collectionNote || '',
      locationTruthRule: 'partner collection point wording only; not a staffed Holo Print branch',
    },
  };
}

export function defaultLocalSeoGeneratorInput(): Required<Pick<LocalSeoGeneratorInput, 'products' | 'locations' | 'collectionPoints' | 'status' | 'includeInSitemap' | 'mode' | 'maxPages'>> {
  return {
    products: DEFAULT_PRODUCTS,
    locations: DEFAULT_LOCATIONS,
    collectionPoints: DEFAULT_COLLECTION_POINTS,
    status: 'draft',
    includeInSitemap: false,
    mode: 'all',
    maxPages: 60,
  };
}

function normaliseInput(input: LocalSeoGeneratorInput = {}) {
  const defaults = defaultLocalSeoGeneratorInput();
  return {
    products: input.products?.length ? input.products : defaults.products,
    locations: input.locations?.length ? input.locations : defaults.locations,
    collectionPoints: input.collectionPoints?.length ? input.collectionPoints : defaults.collectionPoints,
    status: input.status || defaults.status,
    includeInSitemap: Boolean(input.includeInSitemap),
    mode: input.mode || defaults.mode,
    maxPages: Math.max(1, Math.min(150, Number(input.maxPages || defaults.maxPages))),
  };
}

export function previewLocalSeoPages(input: LocalSeoGeneratorInput = {}) {
  const next = normaliseInput(input);
  const pages: SeoPageRecord[] = [];
  if (next.mode === 'all' || next.mode === 'product-location') {
    for (const product of next.products) {
      for (const location of next.locations) pages.push(productLocationPage(product, location, next));
    }
  }
  if (next.mode === 'all' || next.mode === 'service-area') {
    for (const location of next.locations) pages.push(serviceAreaPage(location, next));
  }
  if (next.mode === 'all' || next.mode === 'collection-points') {
    for (const location of next.collectionPoints) pages.push(collectionPointPage(location, next));
  }
  const limited = pages.slice(0, next.maxPages);
  return {
    items: limited,
    skipped: Math.max(0, pages.length - limited.length),
    summary: {
      total: limited.length,
      productLocation: limited.filter((page) => page.pageType === 'product-location').length,
      serviceArea: limited.filter((page) => page.pageType === 'service-area' || page.pageType === 'location').length,
      collectionPoint: limited.filter((page) => page.pageType === 'collection-point').length,
      draft: limited.filter((page) => page.status === 'draft').length,
      published: limited.filter((page) => page.status === 'published').length,
      sitemapReady: limited.filter((page) => page.includeInSitemap).length,
    },
    settings: next,
  };
}

export async function generateLocalSeoPages(request: Request, input: LocalSeoGeneratorInput = {}) {
  const preview = previewLocalSeoPages(input);
  const saved = [] as SeoPageRecord[];
  for (const page of preview.items) saved.push(await saveSeoPage(request, page));
  return { ...preview, items: saved, saved: saved.length };
}
