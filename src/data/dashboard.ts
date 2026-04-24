export const dashboardKpis = [
  {
    id: 'sales',
    label: 'Total Sales',
    value: '£22,910',
    change: '+6.8%',
    hint: 'vs last 30 days'
  },
  {
    id: 'orders',
    label: 'Orders',
    value: '612',
    change: '+3.9%',
    hint: 'fulfilled + pending'
  },
  {
    id: 'aov',
    label: 'Avg Order Value',
    value: '£49.12',
    change: '+2.1%',
    hint: 'per completed order'
  },
  {
    id: 'conversion',
    label: 'Conversion Rate',
    value: '2.9%',
    change: '+0.2%',
    hint: 'trade channel conversion'
  },
  {
    id: 'quotes',
    label: 'Quotes Created',
    value: '96',
    change: '+7.0%',
    hint: 'manual + auto quotes'
  },
  {
    id: 'proofing',
    label: 'Proofing Items',
    value: '9',
    change: '-1',
    hint: 'awaiting approval'
  },
  {
    id: 'products',
    label: 'Active Products',
    value: '201',
    change: '+8',
    hint: 'published products'
  },
  {
    id: 'api',
    label: 'API Usage',
    value: '21.2k',
    change: '21%',
    hint: 'monthly usage'
  }
];

export const dashboardSalesSeries = [
  { label: 'Nov 6', value: 12900 },
  { label: 'Nov 7', value: 15800 },
  { label: 'Nov 8', value: 14250 },
  { label: 'Nov 9', value: 17720 },
  { label: 'Nov 10', value: 16880 },
  { label: 'Nov 11', value: 22110 },
  { label: 'Nov 12', value: 25400 }
];

export const dashboardOrdersSeries = [
  { label: 'Nov 6', value: 140 },
  { label: 'Nov 7', value: 198 },
  { label: 'Nov 8', value: 152 },
  { label: 'Nov 9', value: 210 },
  { label: 'Nov 10', value: 196 },
  { label: 'Nov 11', value: 244 },
  { label: 'Nov 12', value: 278 }
];

export const dashboardApiUsage = [
  { name: 'Storefront', value: 54 },
  { name: 'Admin', value: 28 },
  { name: 'Automation', value: 12 },
  { name: 'Uploads', value: 6 }
];

export const dashboardReferrers = [
  { source: 'Direct', sessions: 2401, conversion: '3.9%' },
  { source: 'Sales Team Links', sessions: 884, conversion: '5.8%' },
  { source: 'Email Campaign', sessions: 604, conversion: '4.7%' }
];

export const dashboardActivityLog = [
  'Bulk trade order exported to production.',
  'Pricing rule updated for folded leaflets.',
  'New B2B account approved.'
];

export const dashboardAlerts = [
  {
    id: 'a1',
    title: '2 vendors need pricing review',
    description: 'Trade pricing matrix has outdated costs.',
    tone: 'warning' as const
  },
  {
    id: 'a2',
    title: 'Theme content update suggested',
    description: 'Homepage hero banner has not been refreshed in 45 days.',
    tone: 'info' as const
  }
];

export const dashboardHealth = [
  { label: 'API Status', status: 'healthy' },
  { label: 'Storefront', status: 'healthy' },
  { label: 'Billing', status: 'healthy' },
  { label: 'Email Notifications', status: 'healthy' },
  { label: 'Production Queue', status: 'healthy' },
  { label: 'Tax Setup', status: 'healthy' }
];

export const dashboardQuickActions = [
  { label: 'Add Product', href: '/products' },
  { label: 'Create Quote', href: '/quotes' },
  { label: 'Open Orders', href: '/orders' },
  { label: 'Manage Users', href: '/users' }
];

export const dashboardStores = [
  {
    id: 'store-1',
    name: 'Trade Portal',
    domain: 'trade.printnow.test',
    organization: 'CloudPepper Print Group',
    status: 'live',
    theme: 'Studio Light',
    locale: 'en-GB',
    currency: 'GBP',
    plan: 'Growth'
  },
  {
    id: 'store-2',
    name: 'Retail UK',
    domain: 'retail.printnow.test',
    organization: 'CloudPepper Print Group',
    status: 'live',
    theme: 'Night Commerce',
    locale: 'en-GB',
    currency: 'GBP',
    plan: 'Growth'
  },
  {
    id: 'store-3',
    name: 'Wholesale Europe',
    domain: 'eu.printnow.test',
    organization: 'CloudPepper Print Group',
    status: 'staging',
    theme: 'Studio Light',
    locale: 'en-IE',
    currency: 'EUR',
    plan: 'Growth'
  }
];

export const dashboardOrganization = {
  siteName: 'Trade Portal',
  planName: 'Growth',
  billingCycle: 'Monthly',
  subscriptionStatus: 'Active',
  supportTier: 'Priority',
  nextPaymentDate: '2026-04-21',
  storesUsed: 3,
  storesAllowed: 5,
  apiUsageUsed: 68421,
  apiUsageLimit: 100000
};
