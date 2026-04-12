
export type OwnerEnvironmentStatus = 'healthy' | 'warning' | 'maintenance';
export type OwnerEnvironmentType = 'production' | 'staging' | 'demo';

export type OwnerEnvironmentRecord = {
  id: string;
  tenant: string;
  name: string;
  type: OwnerEnvironmentType;
  status: OwnerEnvironmentStatus;
  region: string;
  releaseChannel: string;
  owner: string;
  notes: string;
};

export const ownerEnvironmentSeed: OwnerEnvironmentRecord[] = [
  {
    id: 'env-1',
    tenant: 'Northstar Print',
    name: 'Northstar Production',
    type: 'production',
    status: 'healthy',
    region: 'eu-west-2',
    releaseChannel: 'stable',
    owner: 'Platform Admin',
    notes: 'Primary live tenant environment.'
  },
  {
    id: 'env-2',
    tenant: 'BluePeak Mailers',
    name: 'BluePeak Demo',
    type: 'demo',
    status: 'maintenance',
    region: 'eu-west-1',
    releaseChannel: 'preview',
    owner: 'Support Admin',
    notes: 'Demo environment being refreshed before the next sales cycle.'
  },
  {
    id: 'env-3',
    tenant: 'PixelPress Studio',
    name: 'PixelPress Staging',
    type: 'staging',
    status: 'warning',
    region: 'us-east-1',
    releaseChannel: 'beta',
    owner: 'Owner Ops',
    notes: 'Release checks flagged recent config drift.'
  }
];
