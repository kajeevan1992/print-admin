import type { Id } from '@/types/common';

export type AccessStatus = 'draft' | 'active' | 'disabled';
export type KeyType = 'public' | 'secret';
export type KeyStatus = 'active' | 'inactive' | 'restricted';
export type EnvironmentName = 'production' | 'staging' | 'development';

export type ApiAccessProfile = {
  id: Id;
  name: string;
  status: AccessStatus;
  owner: string;
  enabled: boolean;
  contact: string;
  reference: string;
  reviewCycle: 'Weekly' | 'Monthly' | 'Quarterly';
  notes: string;
  allowedScopes: string[];
  environments: EnvironmentName[];
  rateLimitPerMinute: number;
  ipAllowList: string;
  webhookEnabled: boolean;
  lastSaved: string;
};

export type ApiKeyRecord = {
  id: Id;
  name: string;
  type: KeyType;
  environment: EnvironmentName;
  status: KeyStatus;
  prefix: string;
  scopes: string[];
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
  owner: string;
  notes: string;
};

export type OrganizationRecord = {
  id: Id;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  primaryContact: string;
  storefronts: string[];
  collections: string[];
  userGroups: string[];
  billingModel: 'invoice' | 'card' | 'hybrid';
  notes: string;
  createdAt: string;
};

export type MerchantAccount = {
  id: Id;
  name: string;
  provider: string;
  status: 'active' | 'inactive';
  mode: 'live' | 'test';
  settlementCurrency: string;
  merchantId: string;
  supportedMethods: string[];
  feeProfile: string;
  payoutSchedule: string;
  owner: string;
  notes: string;
};
