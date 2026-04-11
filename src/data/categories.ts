import type { Category, CategoryTag } from '@/modules/categories/types';

export const categoryTagsMock: CategoryTag[] = [
  { id: 'ct-1', label: 'Popular' },
  { id: 'ct-2', label: 'Business' },
  { id: 'ct-3', label: 'Packaging' },
  { id: 'ct-4', label: 'Large Format' }
];

export const categoriesMock: Category[] = [
  {
    id: 'cat-catalogs',
    name: 'Catalogs',
    description: 'Multi-page product catalogs and stitched brochures.',
    parentId: null,
    pricingId: 'price-catalog',
    attributeSetId: 'attr-print-core',
    published: true,
    thumbnail: 'https://placehold.co/96x96/111827/ffffff?text=CA',
    friendlyUrl: '/catalogs',
    productCount: 1,
    sortOrder: 10,
    accuZipConfig: '',
    useAlternateMaster: false,
    tags: [categoryTagsMock[0], categoryTagsMock[1]],
    canBrowse: true,
    canUpload: true,
    canUploadLater: false,
    canCreate: true,
    canCustom: true
  },
  {
    id: 'cat-business-cards',
    name: 'Business Cards',
    description: 'Cards, mini cards, and premium branded stationery.',
    parentId: null,
    pricingId: 'price-card',
    attributeSetId: 'attr-paper-finishes',
    published: true,
    thumbnail: 'https://placehold.co/96x96/0f172a/ffffff?text=BC',
    friendlyUrl: '/business-cards',
    productCount: 1,
    sortOrder: 20,
    accuZipConfig: '',
    useAlternateMaster: false,
    tags: [categoryTagsMock[1]],
    canBrowse: true,
    canUpload: false,
    canUploadLater: false,
    canCreate: true,
    canCustom: true
  },
  {
    id: 'cat-signage',
    name: 'Signage',
    description: 'Banners, boards, and large-format display products.',
    parentId: null,
    pricingId: 'price-signage',
    attributeSetId: 'attr-large-format',
    published: false,
    thumbnail: 'https://placehold.co/96x96/1d4ed8/ffffff?text=SG',
    friendlyUrl: '/signage',
    productCount: 0,
    sortOrder: 30,
    accuZipConfig: '',
    useAlternateMaster: true,
    tags: [categoryTagsMock[3]],
    canBrowse: true,
    canUpload: true,
    canUploadLater: true,
    canCreate: false,
    canCustom: true
  }
];

export const pricingOptionsMock = [
  { id: 'price-catalog', name: 'Catalog Pricing' },
  { id: 'price-card', name: 'Card Pricing' },
  { id: 'price-signage', name: 'Signage Pricing' },
  { id: 'price-static', name: 'Custom Size / Static' }
];

export const attributeSetOptionsMock = [
  { id: 'attr-print-core', name: 'Print Core' },
  { id: 'attr-paper-finishes', name: 'Paper & Finish' },
  { id: 'attr-large-format', name: 'Large Format' }
];

export const accuZipOptionsMock = [
  { id: 'accu-std', name: 'Standard Postal Presort' },
  { id: 'accu-bulk', name: 'Bulk Mail Processing' }
];
