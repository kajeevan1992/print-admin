import { KPI, Product, ProductAttribute } from '@/types';

export const kpis: KPI[] = [
  { label: 'Gross Revenue', value: '$248,420', trend: '+12.4% MoM' },
  { label: 'Orders Processed', value: '8,942', trend: '+8.2% MoM' },
  { label: 'Quote Conversion', value: '31.7%', trend: '+2.1 pts' },
  { label: 'Avg. Turnaround', value: '2.8 days', trend: '-0.4 days' }
];

export const salesSeries = [
  { month: 'Jan', orders: 760, quotes: 1200 },
  { month: 'Feb', orders: 840, quotes: 1360 },
  { month: 'Mar', orders: 920, quotes: 1440 },
  { month: 'Apr', orders: 980, quotes: 1520 },
  { month: 'May', orders: 1110, quotes: 1680 },
  { month: 'Jun', orders: 1240, quotes: 1760 }
];

export const apiUsage = [
  { name: 'Storefront API', value: 54 },
  { name: 'Pricing API', value: 21 },
  { name: 'Order API', value: 14 },
  { name: 'Artwork API', value: 11 }
];

export const activityLog = [
  'New vendor "BlueLine Print" onboarded',
  'Product "Premium Catalog A4" updated',
  'Pricing rule "Bulk 5k+" activated',
  'Theme "Night Commerce" published'
];

export const referrers = [
  { source: 'Organic Search', sessions: 12044, conversion: '3.9%' },
  { source: 'Partner Links', sessions: 6380, conversion: '4.7%' },
  { source: 'Direct', sessions: 4421, conversion: '3.3%' }
];

export const products: Product[] = [
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

export const productAttributes: ProductAttribute[] = [
  { id: 'a1', name: 'Paper Stock', type: 'select', required: true },
  { id: 'a2', name: 'Lamination', type: 'select', required: false },
  { id: 'a3', name: 'Quantity', type: 'number', required: true }
];
