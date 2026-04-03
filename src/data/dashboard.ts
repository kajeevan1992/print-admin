import type { KPI } from '@/modules/dashboard/types';

export const dashboardKpis: KPI[] = [
  { label: 'Gross Revenue', value: '$248,420', trend: '+12.4% MoM' },
  { label: 'Orders Processed', value: '8,942', trend: '+8.2% MoM' },
  { label: 'Quote Conversion', value: '31.7%', trend: '+2.1 pts' },
  { label: 'Avg. Turnaround', value: '2.8 days', trend: '-0.4 days' }
];

export const dashboardSalesSeries = [
  { month: 'Jan', orders: 760, quotes: 1200 },
  { month: 'Feb', orders: 840, quotes: 1360 },
  { month: 'Mar', orders: 920, quotes: 1440 },
  { month: 'Apr', orders: 980, quotes: 1520 },
  { month: 'May', orders: 1110, quotes: 1680 },
  { month: 'Jun', orders: 1240, quotes: 1760 }
];

export const dashboardApiUsage = [
  { name: 'Storefront API', value: 54 },
  { name: 'Pricing API', value: 21 },
  { name: 'Order API', value: 14 },
  { name: 'Artwork API', value: 11 }
];

export const dashboardActivityLog = [
  'New vendor "BlueLine Print" onboarded',
  'Product "Premium Catalog A4" updated',
  'Pricing rule "Bulk 5k+" activated',
  'Theme "Night Commerce" published'
];

export const dashboardReferrers = [
  { source: 'Organic Search', sessions: 12044, conversion: '3.9%' },
  { source: 'Partner Links', sessions: 6380, conversion: '4.7%' },
  { source: 'Direct', sessions: 4421, conversion: '3.3%' }
];
