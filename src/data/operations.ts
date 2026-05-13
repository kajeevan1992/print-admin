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
  customer?: string;
  artworkStatus?: 'missing' | 'uploaded' | 'preflight-review' | 'changes-requested' | 'approved';
  preflightStatus?: 'pending' | 'pass' | 'warning' | 'fail' | 'override';
  assignedOperator?: string;
  machineName?: string;
  priority?: 'standard' | 'priority' | 'rush';
  productionNotes?: string;
  dispatchMethod?: 'collection' | 'local-delivery' | 'courier' | 'royal-mail';
  handoffState?: 'needs-artwork' | 'ready-for-print' | 'printing' | 'finishing' | 'ready-to-dispatch' | 'dispatched' | 'blocked';
};

export type ArtworkProof = {
  id: string;
  orderNumber: string;
  customer: string;
  product: string;
  owner: string;
  status: 'awaiting-review' | 'changes-requested' | 'customer-approval' | 'approved';
  risk: 'low' | 'medium' | 'high';
  dueDate: string;
  notes: string;
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
  {
    id: 'pj-1001',
    orderNumber: 'ORD-32018',
    customer: 'Northwind Office',
    product: 'Premium Catalog A4',
    plant: 'Nevada DC',
    stage: 'printing',
    slaRisk: 'medium',
    dueDate: '2026-04-07',
    artworkStatus: 'approved',
    preflightStatus: 'pass',
    assignedOperator: 'Prepress Team',
    machineName: 'Ricoh Pro C5400s',
    priority: 'priority',
    productionNotes: 'Inside spreads approved. Watch colour density on cover stock.',
    dispatchMethod: 'courier',
    handoffState: 'printing'
  },
  {
    id: 'pj-1002',
    orderNumber: 'ORD-32024',
    customer: 'Acme Office',
    product: 'Matte Business Card',
    plant: 'Texas Plant',
    stage: 'queued',
    slaRisk: 'low',
    dueDate: '2026-04-08',
    artworkStatus: 'uploaded',
    preflightStatus: 'pending',
    assignedOperator: 'Studio Desk',
    machineName: 'Digital Press 01',
    priority: 'standard',
    productionNotes: 'Awaiting final internal artwork check before print release.',
    dispatchMethod: 'collection',
    handoffState: 'needs-artwork'
  },
  {
    id: 'pj-1003',
    orderNumber: 'ORD-32031',
    customer: 'Bright Dental',
    product: 'Direct Mail Letter Pack',
    plant: 'New Jersey Hub',
    stage: 'proofing',
    slaRisk: 'high',
    dueDate: '2026-04-06',
    artworkStatus: 'changes-requested',
    preflightStatus: 'fail',
    assignedOperator: 'Prepress Team',
    machineName: 'Mail Pack Cell',
    priority: 'rush',
    productionNotes: 'Bleed issue on folded panel and missing postage zone margin.',
    dispatchMethod: 'royal-mail',
    handoffState: 'blocked'
  },
  {
    id: 'pj-1004',
    orderNumber: 'ORD-32044',
    customer: 'Nova Retail',
    product: 'Window Vinyl Kit',
    plant: 'Nevada DC',
    stage: 'finishing',
    slaRisk: 'medium',
    dueDate: '2026-04-10',
    artworkStatus: 'approved',
    preflightStatus: 'override',
    assignedOperator: 'Large Format Team',
    machineName: 'Roll-to-roll Latex',
    priority: 'priority',
    productionNotes: 'Laminate before trimming. Customer collecting from front counter.',
    dispatchMethod: 'collection',
    handoffState: 'finishing'
  }
];

export const artworkProofsMock: ArtworkProof[] = [
  { id: 'ap-1001', orderNumber: 'ORD-32018', customer: 'Northwind Office', product: 'Premium Catalog A4', owner: 'Prepress Team', status: 'customer-approval', risk: 'medium', dueDate: '2026-04-08', notes: 'Customer requested final colour confirmation on inside spreads.' },
  { id: 'ap-1002', orderNumber: 'ORD-32024', customer: 'Acme Office', product: 'Matte Business Card', owner: 'Studio Desk', status: 'awaiting-review', risk: 'low', dueDate: '2026-04-09', notes: 'Awaiting internal review before customer send.' },
  { id: 'ap-1003', orderNumber: 'ORD-32031', customer: 'Bright Dental', product: 'Direct Mail Letter Pack', owner: 'Prepress Team', status: 'changes-requested', risk: 'high', dueDate: '2026-04-06', notes: 'Bleed issue on folded panel and missing postage zone margin.' },
  { id: 'ap-1004', orderNumber: 'ORD-32044', customer: 'Nova Retail', product: 'Window Vinyl Kit', owner: 'Account Team', status: 'approved', risk: 'low', dueDate: '2026-04-10', notes: 'Approved and handed to production board.' }
];

export const generalSettingsMock: GeneralSetting[] = [
  { id: 'gs-1', key: 'storefrontName', label: 'Storefront Name', value: 'PrintNow Commerce', group: 'Storefront' },
  { id: 'gs-2', key: 'defaultCurrency', label: 'Default Currency', value: 'USD', group: 'Localization' },
  { id: 'gs-3', key: 'defaultLocale', label: 'Default Locale', value: 'en-US', group: 'Localization' },
  { id: 'gs-4', key: 'checkoutMode', label: 'Checkout Mode', value: 'Standard', group: 'Checkout' },
  { id: 'gs-5', key: 'orderNotificationEmail', label: 'Order Notification Email', value: 'ops@printnow.test', group: 'Notifications' },
  { id: 'gs-6', key: 'supportReplyTo', label: 'Support Reply-To', value: 'support@printnow.test', group: 'Notifications' }
];
