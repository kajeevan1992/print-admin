export type QuoteRecord = {
  id: string;
  customer: string;
  title: string;
  channel: string;
  status: 'draft' | 'sent' | 'approved' | 'expired';
  total: number;
  updatedAt: string;
};

export type CustomerRecord = {
  id: string;
  name: string;
  organization: string;
  email: string;
  segment: 'Retail' | 'B2B' | 'Enterprise';
  status: 'active' | 'invited' | 'inactive';
  spendYtd: number;
  projects: number;
};

export type ProductionJob = {
  id: string;
  orderNumber: string;
  product: string;
  plant: string;
  stage: 'queued' | 'proofing' | 'printing' | 'finishing' | 'shipped';
  slaRisk: 'low' | 'medium' | 'high';
  dueDate: string;
};

export type GeneralSetting = {
  id: string;
  key: string;
  label: string;
  value: string;
  group: 'Storefront' | 'Checkout' | 'Notifications' | 'Localization';
};

export const quotesMock: QuoteRecord[] = [
  { id: 'qt-1001', customer: 'Nova Retail', title: 'Spring signage rollout', channel: 'US Main Store', status: 'sent', total: 4820, updatedAt: '2026-04-05 12:18' },
  { id: 'qt-1002', customer: 'Acme Office', title: 'Business card restock', channel: 'B2B Wholesale API', status: 'approved', total: 960, updatedAt: '2026-04-06 09:05' },
  { id: 'qt-1003', customer: 'Bright Dental', title: 'Direct mail promo pack', channel: 'US Main Store', status: 'draft', total: 2360, updatedAt: '2026-04-06 13:44' }
];

export const customersMock: CustomerRecord[] = [
  { id: 'cu-1001', name: 'Megan Turner', organization: 'Nova Retail', email: 'megan@novaretail.com', segment: 'Enterprise', status: 'active', spendYtd: 28400, projects: 8 },
  { id: 'cu-1002', name: 'Liam Patel', organization: 'Acme Office', email: 'liam@acmeoffice.com', segment: 'B2B', status: 'active', spendYtd: 11240, projects: 3 },
  { id: 'cu-1003', name: 'Sarah Wong', organization: 'Bright Dental', email: 'sarah@brightdental.com', segment: 'Retail', status: 'invited', spendYtd: 1840, projects: 1 }
];

export const productionJobsMock: ProductionJob[] = [
  { id: 'pj-1001', orderNumber: 'ORD-32018', product: 'Premium Catalog A4', plant: 'Nevada DC', stage: 'printing', slaRisk: 'medium', dueDate: '2026-04-07' },
  { id: 'pj-1002', orderNumber: 'ORD-32024', product: 'Matte Business Card', plant: 'Texas Plant', stage: 'queued', slaRisk: 'low', dueDate: '2026-04-08' },
  { id: 'pj-1003', orderNumber: 'ORD-32031', product: 'Direct Mail Letter Pack', plant: 'New Jersey Hub', stage: 'proofing', slaRisk: 'high', dueDate: '2026-04-06' }
];

export const generalSettingsMock: GeneralSetting[] = [
  { id: 'gs-1', key: 'storefrontName', label: 'Storefront Name', value: 'PrintNow Commerce', group: 'Storefront' },
  { id: 'gs-2', key: 'defaultCurrency', label: 'Default Currency', value: 'USD', group: 'Localization' },
  { id: 'gs-3', key: 'defaultLocale', label: 'Default Locale', value: 'en-US', group: 'Localization' },
  { id: 'gs-4', key: 'checkoutMode', label: 'Checkout Mode', value: 'Standard', group: 'Checkout' },
  { id: 'gs-5', key: 'orderNotificationEmail', label: 'Order Notification Email', value: 'ops@printnow.test', group: 'Notifications' },
  { id: 'gs-6', key: 'supportReplyTo', label: 'Support Reply-To', value: 'support@printnow.test', group: 'Notifications' }
];
