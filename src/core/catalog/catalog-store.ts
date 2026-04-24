export type CoreCatalogRecord = Record<string, unknown> & {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  friendlyUrl?: string;
  description?: string;
};

const now = () => new Date().toISOString();

const demo = {
  products: [
    { id: 'prod-business-cards', name: 'Standard Business Cards', slug: 'standard-business-cards', status: 'published', categoryName: 'Print Products', priceFromMinor: 1900, currency: 'GBP', createdAt: now() },
    { id: 'prod-a5-flyers', name: 'A5 Flyers', slug: 'a5-flyers', status: 'published', categoryName: 'Print Products', priceFromMinor: 2900, currency: 'GBP', createdAt: now() },
    { id: 'prod-mailer-boxes', name: 'Mailer Boxes', slug: 'mailer-boxes', status: 'draft', categoryName: 'Packaging', priceFromMinor: 9900, currency: 'GBP', createdAt: now() },
  ],
  categories: [
    { id: 'cat-print-products', name: 'Print Products', friendlyUrl: '/print-products', description: 'Core everyday print catalogue', published: true, productCount: 2, sortOrder: 1, createdAt: now() },
    { id: 'cat-packaging', name: 'Packaging', friendlyUrl: '/packaging', description: 'Boxes, sleeves, and packaging formats', published: true, productCount: 1, sortOrder: 2, createdAt: now() },
    { id: 'cat-large-format', name: 'Large Format', friendlyUrl: '/large-format', description: 'Posters, signage, and displays', published: true, productCount: 0, sortOrder: 3, createdAt: now() },
  ],
  collections: [
    { id: 'col-best-sellers', title: 'Best Sellers', name: 'Best Sellers', friendlyUrl: '/best-sellers', description: 'Top performing products', productIds: ['prod-business-cards'], categoryIds: ['cat-print-products'], createdAt: now() },
    { id: 'col-trade-essentials', title: 'Trade Essentials', name: 'Trade Essentials', friendlyUrl: '/trade-essentials', description: 'Common reseller products', productIds: ['prod-a5-flyers'], categoryIds: ['cat-print-products'], createdAt: now() },
  ],
  tags: [
    { id: 'tag-business-cards', name: 'Business Cards', friendlyUrl: '/business-cards', published: true, sidebar: true, createdAt: now() },
    { id: 'tag-flyers', name: 'Flyers', friendlyUrl: '/flyers', published: true, sidebar: true, createdAt: now() },
    { id: 'tag-premium', name: 'Premium', friendlyUrl: '/premium', published: true, sidebar: false, createdAt: now() },
  ],
  materials: [
    { id: 'mat-350gsm-silk', name: '350gsm Silk', slug: '350gsm-silk', description: 'Smooth coated card stock', gsm: '350gsm', createdAt: now() },
    { id: 'mat-170gsm-silk', name: '170gsm Silk', slug: '170gsm-silk', description: 'Common flyer stock', gsm: '170gsm', createdAt: now() },
    { id: 'mat-pvc-banner', name: 'PVC Banner', slug: 'pvc-banner', description: 'Outdoor banner substrate', gsm: '510gsm', createdAt: now() },
  ],
  finishes: [
    { id: 'fin-matt-lamination', name: 'Matt Lamination', slug: 'matt-lamination', description: 'Protective matt laminate', createdAt: now() },
    { id: 'fin-gloss-lamination', name: 'Gloss Lamination', slug: 'gloss-lamination', description: 'High-shine protective laminate', createdAt: now() },
    { id: 'fin-spot-uv', name: 'Spot UV', slug: 'spot-uv', description: 'Selective gloss UV coating', createdAt: now() },
  ],
  productOptionGroups: [],
  printerProfiles: [],
  shippingMethods: [],
  artworkProfiles: [
    { id: 'art-marketing-standard', name: 'Marketing standard', slug: 'marketing-standard', description: 'Bleed, CMYK, fonts and DPI checks', metadataJson: { subtitle: 'soft-proof', meta: 'Bleed • CMYK • fonts • DPI', risk: 'normal', audience: 'studio' }, createdAt: now() },
    { id: 'art-booklet-production', name: 'Booklet production', slug: 'booklet-production', description: 'Pagination, creep and binding checks', metadataJson: { subtitle: 'hard-proof', meta: 'Pagination • creep • binding', risk: 'high', audience: 'prepress + client' }, createdAt: now() },
  ],
  productionRoutingRules: [
    { id: 'route-business-cards-silk', name: 'Business cards on silk', slug: 'business-cards-on-silk', description: 'cards • standard', metadataJson: { family: 'cards', stock: '350gsm Silk', route: 'HP Indigo 7K', fallback: 'Xerox Iridesse', state: 'active', meta: 'HP Indigo 7K → spot UV on Xerox Iridesse' }, createdAt: now() },
    { id: 'route-booklets-long-run', name: 'Booklets long run', slug: 'booklets-long-run', description: 'books • priority', metadataJson: { family: 'books', stock: '130gsm Silk', route: 'Komori Lithrone', fallback: 'HP Indigo 7K', state: 'active', meta: 'Komori Lithrone preferred for 1000+' }, createdAt: now() },
  ],
  optionSets: [
    { id: 'opt-business-card-options', name: 'Business Card Options', slug: 'business-card-options', description: 'Size, stock, finish, and quantity', createdAt: now() },
    { id: 'opt-flyer-options', name: 'Flyer Options', slug: 'flyer-options', description: 'Size, paper, sides, and quantity', createdAt: now() },
  ],
};

export type CatalogResource =
  | 'products'
  | 'categories'
  | 'collections'
  | 'tags'
  | 'materials'
  | 'finishes'
  | 'option-sets'
  | 'product-option-groups'
  | 'printer-profiles'
  | 'shipping-methods'
  | 'artwork-profiles'
  | 'production-routing-rules';

export function listDemoCatalog(resource: CatalogResource) {
  if (resource === 'option-sets') return demo.optionSets;
  if (resource === 'product-option-groups') return demo.productOptionGroups;
  if (resource === 'printer-profiles') return demo.printerProfiles;
  if (resource === 'shipping-methods') return demo.shippingMethods;
  if (resource === 'artwork-profiles') return demo.artworkProfiles;
  if (resource === 'production-routing-rules') return demo.productionRoutingRules;
  return demo[resource] ?? [];
}

export function toPaginated(items: CoreCatalogRecord[], page = 1, limit = 50) {
  return {
    items,
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: 1,
    },
  };
}
