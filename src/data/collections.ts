import type { Collection } from '@/modules/collections/types';

export const collectionsMock: Collection[] = [
  {
    id: 'col-1001',
    title: 'Corporate Essentials',
    createdOn: '2026-04-01',
    productIds: ['p-1001', 'p-1002'],
    categoryIds: ['cat-catalogs', 'cat-business-cards'],
    products: [
      {
        id: 'p-1001',
        name: 'Premium Catalog A4',
        thumbnail: 'https://placehold.co/96x96/111827/ffffff?text=PC',
        productNumbers: { itemNumber: 'I-88341', modelNumber: 'M-CAT-2401' }
      },
      {
        id: 'p-1002',
        name: 'Matte Business Card',
        thumbnail: 'https://placehold.co/96x96/0f172a/ffffff?text=BC',
        productNumbers: { itemNumber: 'I-14328', modelNumber: 'M-BC-9005' }
      }
    ],
    categories: [
      {
        id: 'cat-catalogs',
        name: 'Catalogs',
        thumbnail: 'https://placehold.co/96x96/111827/ffffff?text=CA'
      },
      {
        id: 'cat-business-cards',
        name: 'Business Cards',
        thumbnail: 'https://placehold.co/96x96/0f172a/ffffff?text=BC'
      }
    ]
  }
];
