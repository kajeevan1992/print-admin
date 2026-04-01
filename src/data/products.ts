import type { Product, ProductAttribute } from '@/modules/products/types';

export const productsMock: Product[] = [
  {
    id: 'p-1001',
    name: 'Premium Catalog A4',
    category: 'Catalogs',
    vendor: 'BlueLine Print',
    sku: 'CAT-A4-PRM',
    price: 12.5,
    published: true,
    global: true,
    updatedAt: '2026-03-28'
  },
  {
    id: 'p-1002',
    name: 'Matte Business Card',
    category: 'Business Cards',
    vendor: 'PrintWave',
    sku: 'BC-MAT-STD',
    price: 0.14,
    published: true,
    global: false,
    updatedAt: '2026-03-30'
  },
  {
    id: 'p-1003',
    name: 'Roll-up Banner 33x80',
    category: 'Signage',
    vendor: 'NorthPress',
    sku: 'BAN-33-80',
    price: 89,
    published: false,
    global: true,
    updatedAt: '2026-03-25'
  }
];

export const productAttributesMock: ProductAttribute[] = [
  { id: 'a1', name: 'Paper Stock', type: 'select', required: true },
  { id: 'a2', name: 'Lamination', type: 'select', required: false },
  { id: 'a3', name: 'Quantity', type: 'number', required: true }
];

export const categoryOptions = ['Catalogs', 'Business Cards', 'Signage', 'Flyers', 'Posters'];
export const vendorOptions = ['BlueLine Print', 'PrintWave', 'NorthPress', 'ColorForge'];
