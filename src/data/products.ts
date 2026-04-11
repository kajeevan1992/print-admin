import type { Product, ProductTag } from '@/modules/products/types';

export const productCategories = [
  { id: 'cat-catalogs', name: 'Catalogs' },
  { id: 'cat-business-cards', name: 'Business Cards' },
  { id: 'cat-signage', name: 'Signage' },
  { id: 'cat-packaging', name: 'Packaging' }
];

export const productVendors = [
  { id: 'ven-blueline', name: 'BlueLine Print' },
  { id: 'ven-printwave', name: 'PrintWave' },
  { id: 'ven-northpress', name: 'NorthPress' }
];

export const storefrontOptions = [
  { id: 'store-na', name: 'North America Store' },
  { id: 'store-eu', name: 'Europe Store' },
  { id: 'store-b2b', name: 'B2B Wholesale Store' }
];

const sharedTags: ProductTag[] = [
  { id: 't1', label: 'Premium', color: 'violet' },
  { id: 't2', label: 'Fast Turnaround', color: 'emerald' },
  { id: 't3', label: 'Top Seller', color: 'blue' }
];

export const productsMock: Product[] = [
  {
    id: 'p-1001',
    sortOrder: 10,
    slug: 'premium-catalog-a4',
    name: 'Premium Catalog A4',
    description: 'High-end stitched catalog built for product showcases and premium brochures.',
    productType: 'online',
    creationMethod: 'print-editor-template',
    categoryId: 'cat-catalogs',
    vendorId: 'ven-blueline',
    hotFolder: 'catalog/a4',
    pages: 24,
    units: 'mm',
    width: 210,
    height: 297,
    bleed: 3,
    cmsPageLink: '/products/premium-catalog-a4',
    previewUrl: 'https://preview.example.com/p-1001',
    status: 'active',
    published: true,
    isGlobal: true,
    storefrontIds: ['store-na', 'store-eu'],
    channelIds: ['ch-1'],
    thumbnail: 'https://placehold.co/96x96/1f2937/ffffff?text=PC',
    lastSavedAt: '2026-04-02 14:30 UTC',
    productNumbers: { itemNumber: 'I-88341', modelNumber: 'M-CAT-2401', integrationId: 'INT-CAT-1' },
    templateDefaults: {
      scaleFactor: 1,
      zoomState: 'fit',
      palette: 'Brand Core',
      colorSpace: 'CMYK',
      editorMode: 'advanced',
      textModes: ['point', 'paragraph'],
      imageMode: 'cover',
      previewType: '2D',
      photoGroup: 'Catalog Lifestyle',
      model3d: 'CatalogStapledA4',
      defaultFont: 'Inter',
      toggles: [{ key: 'Snap to grid', enabled: true }],
      rules: ['Minimum 8pt for body copy']
    },
    templateSetup: {
      setupProfile: 'catalog-standard',
      allowUpload: true,
      allowLayers: true,
      smartSnapping: true,
      bleedLocked: true,
      showSafeArea: true
    },
    templateAssets: {
      fonts: ['Inter', 'Montserrat'],
      layouts: ['A4 Portrait'],
      themes: ['Corporate Dark'],
      cliparts: ['Arrows', 'Callouts']
    },
    priceMapping: { basePrice: 12.5, sizeLabel: 'A4', dielineMapping: 'A4_CATALOG_DIELINE', currency: 'USD' },
    tags: [sharedTags[0], sharedTags[2]],
    comments: [{ id: 'c1', author: 'Alex Rivera', timestamp: '2026-03-30 10:12', label: 'internal', message: 'Need to verify bleed setup before pushing globally.' }],
    internalNotes: 'Font coverage warning pending.',
    inventory: { onHandQuantity: 1240, reorderQuantity: 400 },
    relatedProducts: [{ id: 'p-1002', name: 'Matte Business Card', slug: 'matte-business-card', thumbnail: 'https://placehold.co/80x80?text=BC' }],
    attributes: [{ id: 'a1', type: 'Paper Type', value: 'Silk 170gsm' }],
    alternateViews: [{ id: 'av1', label: 'Front Angle', url: 'https://placehold.co/300x180?text=Front' }],
    updatedAt: '2026-04-02'
  },
  {
    id: 'p-1002',
    sortOrder: 20,
    slug: 'matte-business-card',
    name: 'Matte Business Card',
    description: 'Standard matte card with optional foil and spot UV upgrades.',
    productType: 'static',
    creationMethod: 'idml',
    categoryId: 'cat-business-cards',
    vendorId: 'ven-printwave',
    hotFolder: 'cards/matte',
    pdfFileUrl: 'https://files.example.com/products/p-1002.pdf',
    pages: 2,
    units: 'mm',
    width: 90,
    height: 50,
    bleed: 2,
    cmsPageLink: '/products/matte-business-card',
    previewUrl: 'https://preview.example.com/p-1002',
    status: 'active',
    published: true,
    isGlobal: false,
    storefrontIds: ['store-na'],
    channelIds: ['ch-1', 'ch-2'],
    thumbnail: 'https://placehold.co/96x96/0f172a/ffffff?text=BC',
    lastSavedAt: '2026-04-01 20:22 UTC',
    productNumbers: { itemNumber: 'I-14328', modelNumber: 'M-BC-9005', integrationId: 'INT-BC-2' },
    templateDefaults: {
      scaleFactor: 1,
      zoomState: 'fill',
      palette: 'Default',
      colorSpace: 'CMYK',
      editorMode: 'simple',
      textModes: ['point'],
      imageMode: 'contain',
      previewType: 'Proof',
      photoGroup: 'Studio',
      model3d: 'BusinessCard',
      defaultFont: 'Roboto',
      toggles: [{ key: 'Bleed guides', enabled: true }],
      rules: ['No transparent text']
    },
    templateSetup: {
      setupProfile: 'card-standard',
      allowUpload: true,
      allowLayers: false,
      smartSnapping: true,
      bleedLocked: true,
      showSafeArea: true
    },
    templateAssets: {
      fonts: ['Roboto'],
      layouts: ['Business Card Horizontal'],
      themes: ['Clean Light'],
      cliparts: []
    },
    priceMapping: { basePrice: 0.14, sizeLabel: '90x50mm', dielineMapping: 'BC_90X50', currency: 'USD' },
    tags: [sharedTags[1]],
    comments: [],
    internalNotes: '',
    inventory: { onHandQuantity: 0, reorderQuantity: 200 },
    relatedProducts: [],
    attributes: [{ id: 'a2', type: 'Finish', value: 'Matte' }],
    alternateViews: [],
    updatedAt: '2026-04-01'
  }
];

export const suggestedProductTags: ProductTag[] = [
  { id: 'st1', label: 'Eco', color: 'emerald' },
  { id: 'st2', label: 'Event', color: 'blue' },
  { id: 'st3', label: 'Luxury', color: 'violet' }
];
