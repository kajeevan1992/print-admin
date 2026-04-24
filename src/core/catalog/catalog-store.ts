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
  | 'option-sets';

export function listDemoCatalog(resource: CatalogResource) {
  if (resource === 'option-sets') return demo.optionSets;
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
