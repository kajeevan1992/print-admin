export type RevenuePoint = { label: string; revenue: number; orders: number };
export type ChannelPerformance = { id: string; channel: string; orders: number; revenue: number; conversion: string; aov: string };
export type ProductPerformance = { id: string; product: string; category: string; orders: number; revenue: number; margin: string };
export type ActivityLogItem = {
  id: string;
  actor: string;
  area: string;
  action: string;
  target: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
};

export const revenueSeries: RevenuePoint[] = [
  { label: 'Mon', revenue: 12450, orders: 48 },
  { label: 'Tue', revenue: 15320, orders: 61 },
  { label: 'Wed', revenue: 11880, orders: 44 },
  { label: 'Thu', revenue: 17640, orders: 72 },
  { label: 'Fri', revenue: 18990, orders: 76 },
  { label: 'Sat', revenue: 14220, orders: 58 },
  { label: 'Sun', revenue: 13110, orders: 52 }
];

export const channelPerformance: ChannelPerformance[] = [
  { id: 'cp-1', channel: 'UK Main Store', orders: 214, revenue: 58420, conversion: '4.8%', aov: '£273' },
  { id: 'cp-2', channel: 'B2B Trade Portal', orders: 89, revenue: 42110, conversion: '8.1%', aov: '£473' },
  { id: 'cp-3', channel: 'Wholesale API', orders: 37, revenue: 26340, conversion: '11.2%', aov: '£712' }
];

export const productPerformance: ProductPerformance[] = [
  { id: 'pp-1', product: 'Premium Catalog A4', category: 'Catalogs', orders: 92, revenue: 15320, margin: '31%' },
  { id: 'pp-2', product: 'Luxury Business Card', category: 'Business Cards', orders: 146, revenue: 11290, margin: '44%' },
  { id: 'pp-3', product: 'Roll-up Banner', category: 'Signage', orders: 41, revenue: 9630, margin: '28%' },
  { id: 'pp-4', product: 'Mailer Box', category: 'Packaging', orders: 58, revenue: 13840, margin: '35%' }
];

export const activityLog: ActivityLogItem[] = [
  { id: 'al-1', actor: 'Alex Rivera', area: 'Products', action: 'Updated', target: 'Premium Catalog A4', timestamp: '2026-04-04 13:14', severity: 'info' },
  { id: 'al-2', actor: 'Mina Chen', area: 'Orders', action: 'Moved to Production', target: 'Order #10542', timestamp: '2026-04-04 12:56', severity: 'info' },
  { id: 'al-3', actor: 'System', area: 'Inventory', action: 'Low stock alert', target: 'Matte Business Card', timestamp: '2026-04-04 12:44', severity: 'warning' },
  { id: 'al-4', actor: 'Support Bot', area: 'Storefront', action: 'API key rotated', target: 'Wholesale API', timestamp: '2026-04-04 11:22', severity: 'critical' },
  { id: 'al-5', actor: 'Jordan Pike', area: 'Categories', action: 'Created', target: 'Seasonal Promotions', timestamp: '2026-04-04 10:38', severity: 'info' },
  { id: 'al-6', actor: 'Alex Rivera', area: 'Content', action: 'Published', target: 'Spring Print Campaign', timestamp: '2026-04-04 09:50', severity: 'info' },
  { id: 'al-7', actor: 'System', area: 'Checkout', action: 'Tax config mismatch detected', target: 'EU VAT settings', timestamp: '2026-04-04 09:18', severity: 'warning' }
];