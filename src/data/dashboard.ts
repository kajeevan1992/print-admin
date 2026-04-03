export const dashboardStores = [
  {
    id: 'store-1',
    name: 'PrintNow Main Store',
    domain: 'store.printnow.test',
    status: 'live',
    plan: 'Growth',
    currency: 'GBP',
    locale: 'en-GB',
    theme: 'Night Commerce'
  },
  {
    id: 'store-2',
    name: 'Trade Portal',
    domain: 'trade.printnow.test',
    status: 'live',
    plan: 'Growth',
    currency: 'GBP',
    locale: 'en-GB',
    theme: 'Studio Light'
  },
  {
    id: 'store-3',
    name: 'Wholesale Demo',
    domain: 'wholesale.printnow.test',
    status: 'draft',
    plan: 'Growth',
    currency: 'EUR',
    locale: 'en-GB',
    theme: 'Night Commerce'
  }
];

export const dashboardOrganizations = {
  id: 'org-1',
  name: 'CloudPepper Print Group',
  planName: 'Growth',
  billingCycle: 'Monthly',
  nextPaymentDate: '2026-04-21',
  subscriptionStatus: 'Active',
  supportTier: 'Priority',
  storesAllowed: 5,
  storesUsed: 3,
  apiQuotaUsed: 68421,
  apiQuotaLimit: 100000
};

export const dashboardPayloadByStoreId = {
  'store-1': {
    kpis: [
      { label: 'Total Sales', value: '£48,240', trend: '+12.4%', helper: 'vs last 30 days' },
      { label: 'Orders', value: '1,284', trend: '+8.1%', helper: 'fulfilled + pending' },
      { label: 'Avg Order Value', value: '£37.57', trend: '+4.2%', helper: 'per completed order' },
      { label: 'Conversion Rate', value: '3.8%', trend: '+0.6%', helper: 'storefront conversion' },
      { label: 'Quotes Created', value: '214', trend: '+11.0%', helper: 'manual + auto quotes' },
      { label: 'Proofing Items', value: '16', trend: '-2', helper: 'awaiting approval' },
      { label: 'Active Products', value: '428', trend: '+23', helper: 'published products' },
      { label: 'API Usage', value: '68.4k', trend: '68%', helper: 'monthly usage' }
    ],
    salesSeries: [
      { label: 'Week 1', value: 8200 },
      { label: 'Week 2', value: 9100 },
      { label: 'Week 3', value: 11700 },
      { label: 'Week 4', value: 13240 }
    ],
    orderSeries: [
      { label: 'Week 1', value: 260 },
      { label: 'Week 2', value: 284 },
      { label: 'Week 3', value: 336 },
      { label: 'Week 4', value: 404 }
    ],
    apiUsage: [
      { label: 'Storefront', value: 52 },
      { label: 'Admin', value: 18 },
      { label: 'Integrations', value: 30 }
    ],
    alerts: [
      { id: 'a1', severity: 'high', title: 'Proof approvals pending', message: '16 jobs are waiting for customer proof approval.' },
      { id: 'a2', severity: 'medium', title: 'Plan usage at 68%', message: 'API usage is above the halfway mark for this billing cycle.' },
      { id: 'a3', severity: 'low', title: 'Store SEO review', message: '12 products are missing meta descriptions.' }
    ],
    activity: [
      'New quote created for Kings Lounge menu print run.',
      'Trade vendor NorthPress accepted production allocation.',
      '2 new admin users invited to organization.',
      'Theme Night Commerce assigned to main channel.'
    ],
    health: [
      { label: 'API Status', status: 'healthy' },
      { label: 'Storefront', status: 'healthy' },
      { label: 'Billing', status: 'healthy' },
      { label: 'Email Notifications', status: 'warning' },
      { label: 'Production Queue', status: 'healthy' },
      { label: 'Tax Setup', status: 'warning' }
    ],
    quickActions: [
      'Add Product',
      'Create Quote',
      'Create Channel',
      'Assign Theme',
      'Open Orders',
      'Production Board'
    ],
    referrers: [
      { source: 'Google Organic', sessions: 8421, conversion: '4.1%' },
      { source: 'Direct', sessions: 3184, conversion: '3.4%' },
      { source: 'Email Campaign', sessions: 1640, conversion: '5.3%' }
    ]
  },
  'store-2': {
    kpis: [
      { label: 'Total Sales', value: '£22,910', trend: '+6.8%', helper: 'vs last 30 days' },
      { label: 'Orders', value: '612', trend: '+3.9%', helper: 'fulfilled + pending' },
      { label: 'Avg Order Value', value: '£49.12', trend: '+2.1%', helper: 'per completed order' },
      { label: 'Conversion Rate', value: '2.9%', trend: '+0.2%', helper: 'trade channel conversion' },
      { label: 'Quotes Created', value: '96', trend: '+7.0%', helper: 'manual + auto quotes' },
      { label: 'Proofing Items', value: '9', trend: '-1', helper: 'awaiting approval' },
      { label: 'Active Products', value: '201', trend: '+8', helper: 'published products' },
      { label: 'API Usage', value: '21.2k', trend: '21%', helper: 'monthly usage' }
    ],
    salesSeries: [
      { label: 'Week 1', value: 4100 },
      { label: 'Week 2', value: 4800 },
      { label: 'Week 3', value: 5700 },
      { label: 'Week 4', value: 8310 }
    ],
    orderSeries: [
      { label: 'Week 1', value: 130 },
      { label: 'Week 2', value: 144 },
      { label: 'Week 3', value: 157 },
      { label: 'Week 4', value: 181 }
    ],
    apiUsage: [
      { label: 'Storefront', value: 35 },
      { label: 'Admin', value: 15 },
      { label: 'Integrations', value: 50 }
    ],
    alerts: [
      { id: 'b1', severity: 'medium', title: '2 vendors need pricing review', message: 'Trade pricing matrix has outdated costs.' },
      { id: 'b2', severity: 'low', title: 'Theme content update suggested', message: 'Homepage hero banner has not been refreshed in 45 days.' }
    ],
    activity: [
      'Bulk trade order exported to production.',
      'Pricing rule updated for folded leaflets.',
      'New B2B account approved.'
    ],
    health: [
      { label: 'API Status', status: 'healthy' },
      { label: 'Storefront', status: 'healthy' },
      { label: 'Billing', status: 'healthy' },
      { label: 'Email Notifications', status: 'healthy' },
      { label: 'Production Queue', status: 'healthy' },
      { label: 'Tax Setup', status: 'healthy' }
    ],
    quickActions: [
      'Add Product',
      'Create Quote',
      'Open Orders',
      'Manage Users'
    ],
    referrers: [
      { source: 'Direct', sessions: 2401, conversion: '3.9%' },
      { source: 'Sales Team Links', sessions: 884, conversion: '5.8%' },
      { source: 'Email Campaign', sessions: 604, conversion: '4.7%' }
    ]
  },
  'store-3': {
    kpis: [
      { label: 'Total Sales', value: '€0', trend: 'Draft', helper: 'store not live yet' },
      { label: 'Orders', value: '0', trend: 'Draft', helper: 'no live orders yet' },
      { label: 'Avg Order Value', value: '€0', trend: 'Draft', helper: 'waiting for launch' },
      { label: 'Conversion Rate', value: '0%', trend: 'Draft', helper: 'store not public' },
      { label: 'Quotes Created', value: '3', trend: '+3', helper: 'internal testing only' },
      { label: 'Proofing Items', value: '1', trend: '0', helper: 'awaiting review' },
      { label: 'Active Products', value: '42', trend: '+42', helper: 'pre-launch catalog' },
      { label: 'API Usage', value: '1.2k', trend: '1%', helper: 'monthly usage' }
    ],
    salesSeries: [
      { label: 'Week 1', value: 0 },
      { label: 'Week 2', value: 0 },
      { label: 'Week 3', value: 0 },
      { label: 'Week 4', value: 0 }
    ],
    orderSeries: [
      { label: 'Week 1', value: 0 },
      { label: 'Week 2', value: 0 },
      { label: 'Week 3', value: 0 },
      { label: 'Week 4', value: 0 }
    ],
    apiUsage: [
      { label: 'Storefront', value: 10 },
      { label: 'Admin', value: 40 },
      { label: 'Integrations', value: 50 }
    ],
    alerts: [
      { id: 'c1', severity: 'high', title: 'Store not fully configured', message: 'Shipping, tax, and payment settings are incomplete.' },
      { id: 'c2', severity: 'medium', title: 'Domain not verified', message: 'Custom domain is not yet bound to the store.' }
    ],
    activity: [
      'Wholesale Demo store created.',
      'Initial theme assigned.',
      'Catalog import completed.'
    ],
    health: [
      { label: 'API Status', status: 'healthy' },
      { label: 'Storefront', status: 'warning' },
      { label: 'Billing', status: 'healthy' },
      { label: 'Email Notifications', status: 'warning' },
      { label: 'Production Queue', status: 'healthy' },
      { label: 'Tax Setup', status: 'warning' }
    ],
    quickActions: [
      'Launch Checklist',
      'Assign Theme',
      'Add Product',
      'Open Settings'
    ],
    referrers: [
      { source: 'Internal QA', sessions: 58, conversion: '0%' }
    ]
  }
};
