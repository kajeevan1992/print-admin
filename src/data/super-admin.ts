export type TenantHealth = 'healthy' | 'watch' | 'critical';
export type TenantStatus = 'active' | 'trial' | 'past_due' | 'setup';

export type TenantAccount = {
  id: string;
  company: string;
  primaryContact: string;
  segment: 'Starter' | 'Growth' | 'Enterprise';
  status: TenantStatus;
  health: TenantHealth;
  seatsUsed: number;
  seatLimit: number;
  activeStores: number;
  monthlyRecurringRevenue: number;
  nextInvoiceAt: string;
  deploymentState: 'stable' | 'queued' | 'attention';
  activationState: 'live' | 'pending' | 'demo';
};

export type DeploymentRecord = {
  id: string;
  tenant: string;
  environment: 'production' | 'staging' | 'demo';
  status: 'queued' | 'deploying' | 'ready' | 'attention';
  owner: string;
  scheduledFor: string;
  note: string;
};

export type DemoUploadRecord = {
  id: string;
  tenant: string;
  assetPack: string;
  status: 'draft' | 'uploaded' | 'approved';
  uploadedBy: string;
  updatedAt: string;
};

export const tenantAccountsSeed: TenantAccount[] = [
  {
    id: 'tenant-1',
    company: 'Northstar Print',
    primaryContact: 'Sophie Patel',
    segment: 'Growth',
    status: 'active',
    health: 'healthy',
    seatsUsed: 18,
    seatLimit: 25,
    activeStores: 3,
    monthlyRecurringRevenue: 2490,
    nextInvoiceAt: '2026-04-28',
    deploymentState: 'stable',
    activationState: 'live'
  },
  {
    id: 'tenant-2',
    company: 'BluePeak Mailers',
    primaryContact: 'Marcus Holt',
    segment: 'Enterprise',
    status: 'past_due',
    health: 'critical',
    seatsUsed: 41,
    seatLimit: 45,
    activeStores: 6,
    monthlyRecurringRevenue: 5980,
    nextInvoiceAt: '2026-04-14',
    deploymentState: 'attention',
    activationState: 'live'
  },
  {
    id: 'tenant-3',
    company: 'PixelPress Studio',
    primaryContact: 'Nina Ward',
    segment: 'Starter',
    status: 'trial',
    health: 'watch',
    seatsUsed: 5,
    seatLimit: 8,
    activeStores: 1,
    monthlyRecurringRevenue: 690,
    nextInvoiceAt: '2026-04-17',
    deploymentState: 'queued',
    activationState: 'demo'
  }
];

export const deploymentSeed: DeploymentRecord[] = [
  { id: 'dep-1', tenant: 'Northstar Print', environment: 'production', status: 'ready', owner: 'Platform Ops', scheduledFor: '2026-04-13', note: 'Store clone rollout with pricing refresh.' },
  { id: 'dep-2', tenant: 'BluePeak Mailers', environment: 'production', status: 'attention', owner: 'Release Lead', scheduledFor: '2026-04-12', note: 'Waiting for payment clearance before production release.' },
  { id: 'dep-3', tenant: 'PixelPress Studio', environment: 'demo', status: 'queued', owner: 'Solutions', scheduledFor: '2026-04-15', note: 'New demo tenant with seeded storefront assets.' }
];

export const demoUploadSeed: DemoUploadRecord[] = [
  { id: 'demo-1', tenant: 'PixelPress Studio', assetPack: 'Luxury packaging demo pack', status: 'uploaded', uploadedBy: 'Owner Ops', updatedAt: '2026-04-10' },
  { id: 'demo-2', tenant: 'Northstar Print', assetPack: 'Wide-format onboarding sample', status: 'approved', uploadedBy: 'Solutions', updatedAt: '2026-04-08' },
  { id: 'demo-3', tenant: 'BluePeak Mailers', assetPack: 'Mailer automation showcase', status: 'draft', uploadedBy: 'Owner Ops', updatedAt: '2026-04-11' }
];
