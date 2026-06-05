type SeoMeta = Record<string, any>;

const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk').replace(/\/$/, '');
const BRAND_NAME = process.env.SEO_ORGANIZATION_NAME || 'Holo Print';
const LOGO_URL = process.env.SEO_ORGANIZATION_LOGO || `${SITE_URL}/logo.png`;
const PHONE = process.env.SEO_ORGANIZATION_PHONE || '020 3336 0322';
const EMAIL = process.env.SEO_ORGANIZATION_EMAIL || 'sales@holoprint.co.uk';

function cleanPath(value: string) {
  const path = String(value || '').trim() || '/';
  const clean = path.split('?')[0].split('#')[0] || '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

function url(path: string) {
  const clean = cleanPath(path);
  return `${SITE_URL}${clean === '/' ? '' : clean}`;
}

function id(path: string, type: string) {
  return `${url(path)}#${type}`;
}

function compact<T extends Record<string, any>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0))) as T;
}

function organization(meta: SeoMeta) {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: BRAND_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    telephone: PHONE,
    email: EMAIL,
    sameAs: Array.isArray(meta.metadata?.sameAs) ? meta.metadata.sameAs : [],
  });
}

function localBusiness(meta: SeoMeta) {
  if (meta.metadata?.googleBusinessEligible === false || meta.pageType === 'collection-point' || meta.pageType === 'service-area') return null;
  const address = meta.metadata?.address || {};
  return compact({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': id(meta.path, 'localbusiness'),
    name: BRAND_NAME,
    url: meta.canonicalUrl || url(meta.path),
    image: LOGO_URL,
    telephone: PHONE,
    email: EMAIL,
    priceRange: '££',
    address: compact({
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress || 'Sidcup High Street',
      addressLocality: address.addressLocality || meta.locationName || 'Sidcup',
      addressRegion: address.addressRegion || 'London',
      postalCode: address.postalCode || '',
      addressCountry: address.addressCountry || 'GB',
    }),
    openingHoursSpecification: meta.metadata?.openingHoursSpecification || [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '17:30' }],
  });
}

function breadcrumb(meta: SeoMeta) {
  const parts = cleanPath(meta.path).split('/').filter(Boolean);
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }];
  parts.forEach((part, index) => {
    const path = `/${parts.slice(0, index + 1).join('/')}`;
    items.push({ '@type': 'ListItem', position: index + 2, name: part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), item: url(path) });
  });
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', '@id': id(meta.path, 'breadcrumb'), itemListElement: items };
}

function faq(meta: SeoMeta) {
  const questions = Array.isArray(meta.faqItems) ? meta.faqItems : [];
  if (!questions.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': id(meta.path, 'faq'),
    mainEntity: questions.map((item: any) => compact({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: compact({ '@type': 'Answer', text: item.answer }),
    })),
  };
}

function webpage(meta: SeoMeta) {
  return compact({
    '@context': 'https://schema.org',
    '@type': meta.pageType === 'collection-point' ? 'CollectionPage' : 'WebPage',
    '@id': id(meta.path, 'webpage'),
    url: meta.canonicalUrl || url(meta.path),
    name: meta.title,
    description: meta.metaDescription,
    isPartOf: { '@id': `${SITE_URL}#website` },
    about: meta.targetKeyword || meta.productName || meta.locationName,
    primaryImageOfPage: meta.metadata?.image ? { '@type': 'ImageObject', url: meta.metadata.image } : undefined,
  });
}

function website() {
  return { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}#website`, name: BRAND_NAME, url: SITE_URL, publisher: { '@id': `${SITE_URL}#organization` } };
}

function product(meta: SeoMeta) {
  if (!meta.productName && meta.pageType !== 'product') return null;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': id(meta.path, 'product'),
    name: meta.productName || meta.h1 || meta.title,
    description: meta.metaDescription,
    brand: { '@type': 'Brand', name: BRAND_NAME },
    category: meta.metadata?.category || 'Print products',
    url: meta.canonicalUrl || url(meta.path),
    image: meta.metadata?.image || LOGO_URL,
    offers: compact({
      '@type': 'Offer',
      url: meta.canonicalUrl || url(meta.path),
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      seller: { '@id': `${SITE_URL}#organization` },
    }),
  });
}

function service(meta: SeoMeta) {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': id(meta.path, 'service'),
    name: meta.h1 || meta.title,
    description: meta.metaDescription,
    provider: { '@id': `${SITE_URL}#organization` },
    areaServed: meta.locationName ? { '@type': 'City', name: meta.locationName } : undefined,
    serviceType: meta.targetKeyword || 'Printing services',
    url: meta.canonicalUrl || url(meta.path),
  });
}

function collectionPage(meta: SeoMeta) {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': id(meta.path, 'collectionpage'),
    name: meta.h1 || meta.title,
    description: meta.metaDescription,
    url: meta.canonicalUrl || url(meta.path),
    isPartOf: { '@id': `${SITE_URL}#website` },
    about: meta.metadata?.collectionTruth || meta.targetKeyword || 'Print collection',
  });
}

export function buildSeoSchemaJsonLd(meta: SeoMeta) {
  const requested = Array.isArray(meta.schemaTypes) ? meta.schemaTypes : ['WebPage'];
  const nodes: any[] = [];
  const add = (node: any) => { if (node) nodes.push(node); };

  if (requested.includes('Organization') || meta.pageType === 'home') add(organization(meta));
  if (meta.pageType === 'home') add(website());
  if (requested.includes('LocalBusiness')) add(localBusiness(meta));
  if (requested.includes('Product') || meta.pageType === 'product' || meta.pageType === 'product-location') add(product(meta));
  if (requested.includes('Service') || meta.pageType === 'service-area') add(service(meta));
  if (requested.includes('CollectionPage') || meta.pageType === 'collection-point') add(collectionPage(meta));
  if (requested.includes('BreadcrumbList')) add(breadcrumb(meta));
  if (requested.includes('FAQPage')) add(faq(meta));
  if (requested.includes('WebPage') || !nodes.some((node) => node['@type'] === 'WebPage' || node['@type'] === 'CollectionPage')) add(webpage(meta));

  const unique = Array.from(new Map(nodes.map((node) => [node['@id'] || `${node['@type']}-${nodes.indexOf(node)}`, node])).values());
  return {
    nodes: unique,
    graph: unique.length === 1 ? unique[0] : { '@context': 'https://schema.org', '@graph': unique.map((node) => {
      const { '@context': _context, ...rest } = node;
      return rest;
    }) },
    warnings: schemaWarnings(meta, unique),
  };
}

function schemaWarnings(meta: SeoMeta, nodes: any[]) {
  const warnings: string[] = [];
  if (meta.pageType === 'collection-point' && nodes.some((node) => node['@type'] === 'LocalBusiness')) warnings.push('Partner collection point must not output LocalBusiness schema.');
  if (meta.metadata?.googleBusinessEligible === false && nodes.some((node) => node['@type'] === 'LocalBusiness')) warnings.push('googleBusinessEligible=false but LocalBusiness schema was requested.');
  if (!nodes.length) warnings.push('No JSON-LD nodes generated.');
  return warnings;
}
