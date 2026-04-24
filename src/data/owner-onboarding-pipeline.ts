
export type OwnerOnboardingStatus = 'not-started' | 'in-progress' | 'completed';
export type OwnerOnboardingStage = 'discovery' | 'setup' | 'launch';

export type OwnerOnboardingRecord = {
  id: string;
  tenant: string;
  stage: OwnerOnboardingStage;
  status: OwnerOnboardingStatus;
  owner: string;
  targetGoLive: string;
  blocker: string;
  nextStep: string;
  summary: string;
};

export const ownerOnboardingSeed: OwnerOnboardingRecord[] = [
  {
    id: 'onboarding-1',
    tenant: 'Northstar Print',
    stage: 'launch',
    status: 'in-progress',
    owner: 'Owner Ops',
    targetGoLive: '2026-04-25',
    blocker: 'Final pricing approval',
    nextStep: 'Confirm storefront pricing matrix',
    summary: 'Customer is in final launch prep with only commercial sign-off remaining.'
  },
  {
    id: 'onboarding-2',
    tenant: 'BluePeak Mailers',
    stage: 'setup',
    status: 'in-progress',
    owner: 'Support Admin',
    targetGoLive: '2026-05-03',
    blocker: 'SSO validation pending',
    nextStep: 'Refresh IdP metadata and re-test login',
    summary: 'Implementation is moving well but identity setup is delaying the next milestone.'
  },
  {
    id: 'onboarding-3',
    tenant: 'PixelPress Studio',
    stage: 'discovery',
    status: 'completed',
    owner: 'Finance Admin',
    targetGoLive: '2026-05-10',
    blocker: 'None',
    nextStep: 'Move into setup workstream',
    summary: 'Discovery is complete and the account is ready to move into setup planning.'
  }
];
