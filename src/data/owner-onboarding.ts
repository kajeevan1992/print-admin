export type OnboardingStatus = 'draft' | 'invited' | 'configuring' | 'ready_for_launch' | 'live';
export type BillingPlan = 'starter' | 'growth' | 'enterprise';
export type Region = 'uk' | 'eu' | 'us';

export type OwnerOnboardingRecord = {
  id: string;
  tenantName: string;
  primaryContact: string;
  email: string;
  company: string;
  billingPlan: BillingPlan;
  region: Region;
  seats: number;
  stores: number;
  status: OnboardingStatus;
  invitationState: 'not_sent' | 'sent' | 'accepted';
  deploymentState: 'not_started' | 'queued' | 'deploying' | 'ready';
  demoPack: 'none' | 'uploaded' | 'approved';
  notes: string;
};

export const ownerOnboardingSeed: OwnerOnboardingRecord[] = [
  {
    id: 'onb-1',
    tenantName: 'Northstar Print',
    primaryContact: 'Sophie Patel',
    email: 'admin@northstarprint.co.uk',
    company: 'Northstar Print',
    billingPlan: 'growth',
    region: 'uk',
    seats: 12,
    stores: 3,
    status: 'live',
    invitationState: 'accepted',
    deploymentState: 'ready',
    demoPack: 'approved',
    notes: 'Flagship launch complete. Ready for customer success handoff.'
  },
  {
    id: 'onb-2',
    tenantName: 'Blue Peak Labels',
    primaryContact: 'Mina Chen',
    email: 'owner@bluepeaklabels.com',
    company: 'Blue Peak Labels',
    billingPlan: 'starter',
    region: 'eu',
    seats: 5,
    stores: 1,
    status: 'configuring',
    invitationState: 'sent',
    deploymentState: 'queued',
    demoPack: 'uploaded',
    notes: 'Waiting on customer content upload and tax setup signoff.'
  },
  {
    id: 'onb-3',
    tenantName: 'TradePrint Warehouse',
    primaryContact: 'Jordan Lee',
    email: 'ops@tradeprintwarehouse.com',
    company: 'TradePrint Warehouse',
    billingPlan: 'enterprise',
    region: 'us',
    seats: 24,
    stores: 2,
    status: 'invited',
    invitationState: 'sent',
    deploymentState: 'not_started',
    demoPack: 'none',
    notes: 'Enterprise deal. Awaiting owner login and rollout workshop.'
  }
];
