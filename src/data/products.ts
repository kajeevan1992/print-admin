import type { Product, ProductAttribute, ProductComment, ProductInventory, ProductTag, RelatedProduct } from '@/modules/products/types';

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

const sharedTags: ProductTag[] = [
  { id: 't1', label: 'Premium', color: 'violet' },
  { id: 't2', label: 'Fast Turnaround', color: 'emerald' },
  { id: 't3', label: 'Top Seller', color: 'blue' },
  { id: 't4', label: 'Wholesale', color: 'amber' }
];

const sharedComments: ProductComment[] = [
  { id: 'c1', author: 'Alex Rivera', timestamp: '2026-03-30 10:12', label: 'internal', message: 'Need to verify bleed setup before pushing globally.' },
  { id: 'c2', author: 'Mina Chen', timestamp: '2026-03-30 14:42', label: 'qa', message: 'Proof generation aligned with updated trim mode.' },
  { id: 'c3', author: 'Vendor Ops', timestamp: '2026-03-31 08:21', label: 'vendor', message: 'Material stock replenished for next two weeks.' }
];

const relatedSet: RelatedProduct[] = [
  { id: 'p-1002', name: 'Matte Business Card', slug: 'matte-business-card', category: 'Business Cards', thumbnail: 'MC' },
  { id: 'p-1004', name: 'Product Insert Leaflet', slug: 'product-insert-leaflet', category: 'Catalogs', thumbnail: 'PL' }
];

const inventorySet: ProductInventory[] = [
  { id: 'inv-1', sku: 'CAT-A4-PRM', warehouse: 'Nevada DC', quantity: 1240, reorderThreshold: 400, availability: 'in-stock' },
  { id: 'inv-2', sku: 'CAT-A4-PRM-EU', warehouse: 'New Jersey Hub', quantity: 220, reorderThreshold: 300, availability: 'low' }
];

export const productsMock: Product[] = [
  {
    id: 'p-1001',
    slug: 'premium-catalog-a4',
    name: 'Premium Catalog A4',
    description: 'High-end stitched catalog built for product showcases and premium brochures.',
    productType: 'templated',
    categoryId: 'cat-catalogs',
    vendorId: 'ven-blueline',
    pages: 24,
    units: 'mm',
    width: 210,
    height: 297,
    bleed: 3,
    status: 'active',
    published: true,
    isGlobal: true,
    channelIds: ['ch-1'],
    thumbnail: 'PC',
    productNumbers: { itemNumber: 'I-88341', modelNumber: 'M-CAT-2401', integrationId: 'INT-CAT-1' },
    templateDefaults: {
      scaleFactor: 1,
      zoomState: 'fit',
      editorMode: 'advanced',
      trimMode: 'full-bleed',
      rotate: 0,
      imageMode: 'cover',
      colorSpace: 'CMYK',
      templateType: 'catalog'
    },
    templateSetup: {
      productsPanel: true,
      uploadPhotos: true,
      imagePanel: true,
      imageSearch: true,
      layersPanel: true,
      socialImageImport: false,
      addTextButton: true,
      restrictNewItem: false
    },
    priceMapping: { basePrice: 12.5, sizeLabel: 'A4', currency: 'USD' },
    tags: [sharedTags[0], sharedTags[2]],
    comments: [sharedComments[0], sharedComments[1]],
    inventory: inventorySet,
    relatedProducts: relatedSet,
    updatedAt: '2026-03-31'
  },
  {
    id: 'p-1002',
    slug: 'matte-business-card',
    name: 'Matte Business Card',
    description: 'Standard 350gsm matte card with optional foil and spot UV upgrades.',
    productType: 'blank',
    categoryId: 'cat-business-cards',
    vendorId: 'ven-printwave',
    pages: 2,
    units: 'mm',
    width: 90,
    height: 50,
    bleed: 2,
    status: 'active',
    published: true,
    isGlobal: false,
    channelIds: ['ch-1', 'ch-2'],
    thumbnail: 'BC',
    productNumbers: { itemNumber: 'I-14328', modelNumber: 'M-BC-9005', integrationId: 'INT-BC-2' },
    templateDefaults: {
      scaleFactor: 1,
      zoomState: 'fill',
      editorMode: 'simple',
      trimMode: 'safe',
      rotate: 0,
      imageMode: 'contain',
      colorSpace: 'CMYK',
      templateType: 'marketing'
    },
    templateSetup: {
      productsPanel: true,
      uploadPhotos: true,
      imagePanel: true,
      imageSearch: true,
      layersPanel: false,
      socialImageImport: true,
      addTextButton: true,
      restrictNewItem: false
    },
    priceMapping: { basePrice: 0.14, sizeLabel: '90x50mm', currency: 'USD' },
    tags: [sharedTags[1], sharedTags[3]],
    comments: [sharedComments[2]],
    inventory: [{ id: 'inv-3', sku: 'BC-MAT-STD', warehouse: 'Nevada DC', quantity: 0, reorderThreshold: 200, availability: 'out-of-stock' }],
    relatedProducts: [],
    updatedAt: '2026-03-30'
  },
  {
    id: 'p-1003',
    slug: 'rollup-banner-33x80',
    name: 'Roll-up Banner 33x80',
    description: 'Portable pull-up banner for trade shows and retail spaces.',
    productType: 'hybrid',
    categoryId: 'cat-signage',
    vendorId: 'ven-northpress',
    pages: 1,
    units: 'in',
    width: 33,
    height: 80,
    bleed: 0.25,
    status: 'draft',
    published: false,
    isGlobal: true,
    channelIds: ['ch-2'],
    thumbnail: 'RB',
    productNumbers: { itemNumber: 'I-20011', modelNumber: 'M-RB-3380', integrationId: 'INT-BAN-9' },
    templateDefaults: {
      scaleFactor: 1,
      zoomState: 'fit',
      editorMode: 'advanced',
      trimMode: 'safe',
      rotate: 0,
      imageMode: 'cover',
      colorSpace: 'RGB',
      templateType: 'marketing'
    },
    templateSetup: {
      productsPanel: true,
      uploadPhotos: true,
      imagePanel: true,
      imageSearch: false,
      layersPanel: true,
      socialImageImport: false,
      addTextButton: true,
      restrictNewItem: true
    },
    priceMapping: { basePrice: 89, sizeLabel: '33x80', currency: 'USD' },
    tags: [sharedTags[0]],
    comments: [],
    inventory: [{ id: 'inv-4', sku: 'BAN-33-80', warehouse: 'Texas Plant', quantity: 37, reorderThreshold: 20, availability: 'in-stock' }],
    relatedProducts: [relatedSet[1]],
    updatedAt: '2026-03-25'
  }
];

export const productAttributesByProductId: Record<string, ProductAttribute[]> = {
  'p-1001': [
    { id: 'a1', name: 'Paper Type', type: 'select', required: true, values: ['Silk 170gsm', 'Gloss 170gsm', 'Uncoated 140gsm'] },
    { id: 'a2', name: 'Finish', type: 'select', required: false, values: ['Matte', 'Gloss', 'Soft Touch'] },
    { id: 'a3', name: 'Lamination', type: 'select', required: false, values: ['None', 'Single Side', 'Double Side'] }
  ],
  'p-1002': [
    { id: 'a4', name: 'Size', type: 'select', required: true, values: ['90x50mm', '85x55mm'] },
    { id: 'a5', name: 'Paper Type', type: 'select', required: true, values: ['350gsm', '400gsm'] }
  ],
  'p-1003': [
    { id: 'a6', name: 'Material', type: 'select', required: true, values: ['Vinyl', 'Fabric'] }
  ]
};

export const suggestedProductTags: ProductTag[] = [
  { id: 'st1', label: 'Eco', color: 'emerald' },
  { id: 'st2', label: 'Event', color: 'blue' },
  { id: 'st3', label: 'Luxury', color: 'violet' }
];
