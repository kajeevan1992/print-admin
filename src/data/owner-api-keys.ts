
export type OwnerApiKeyStatus = 'active' | 'paused' | 'revoked';
export type OwnerApiKeyScope = 'tenant' | 'platform' | 'integration';

export type OwnerApiKeyRecord = {
  id: string;
  label: string;
  tenant: string;
  scope: OwnerApiKeyScope;
  status: OwnerApiKeyStatus;
  keyPreview: string;
  lastUsedAt: string;
  owner: string;
  notes: string;
};

export const ownerApiKeySeed: OwnerApiKeyRecord[] = [
  {
    id: 'key-1',
    label: 'Northstar production sync',
    tenant: 'Northstar Print',
    scope: 'tenant',
    status: 'active',
    keyPreview: 'pk_live_northstar_83f2••••',
    lastUsedAt: '2026-04-11 18:10',
    owner: 'Platform Admin',
    notes: 'Used for storefront sync and pricing callbacks.'
  },
  {
    id: 'key-2',
    label: 'Owner reporting bridge',
    tenant: 'All tenants',
    scope: 'platform',
    status: 'paused',
    keyPreview: 'pk_platform_owner_1bc9••••',
    lastUsedAt: '2026-04-10 09:45',
    owner: 'Owner Ops',
    notes: 'Paused while owner metrics pipeline is being revised.'
  },
  {
    id: 'key-3',
    label: 'Demo upload integration',
    tenant: 'BluePeak Mailers',
    scope: 'integration',
    status: 'active',
    keyPreview: 'pk_demo_bluepeak_44d7••••',
    lastUsedAt: '2026-04-09 14:22',
    owner: 'Support Admin',
    notes: 'Used by the demo library uploader flow.'
  }
];
