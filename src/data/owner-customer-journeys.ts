
export type OwnerCustomerJourneyStatus = 'mapped' | 'in-progress' | 'complete';
export type OwnerCustomerJourneyStage = 'onboarding' | 'adoption' | 'expansion';

export type OwnerCustomerJourneyRecord = {
  id: string;
  tenant: string;
  stage: OwnerCustomerJourneyStage;
  status: OwnerCustomerJourneyStatus;
  owner: string;
  priorityTouchpoint: string;
  nextReviewDate: string;
  goal: string;
  summary: string;
};

export const ownerCustomerJourneySeed: OwnerCustomerJourneyRecord[] = [
  {
    id: 'journey-1',
    tenant: 'Northstar Print',
    stage: 'expansion',
    status: 'in-progress',
    owner: 'Owner Ops',
    priorityTouchpoint: 'Executive roadmap review',
    nextReviewDate: '2026-05-02',
    goal: 'Expand storefront and seat usage',
    summary: 'Journey plan is focused on executive alignment and expansion readiness.'
  },
  {
    id: 'journey-2',
    tenant: 'BluePeak Mailers',
    stage: 'adoption',
    status: 'mapped',
    owner: 'Finance Admin',
    priorityTouchpoint: 'Billing confidence check-in',
    nextReviewDate: '2026-04-24',
    goal: 'Stabilize adoption after billing concerns',
    summary: 'Journey is mapped with commercial reassurance and usage follow-up as the next step.'
  },
  {
    id: 'journey-3',
    tenant: 'PixelPress Studio',
    stage: 'onboarding',
    status: 'complete',
    owner: 'Support Admin',
    priorityTouchpoint: 'Post-launch success review',
    nextReviewDate: '2026-04-20',
    goal: 'Confirm launch success and transition to adoption',
    summary: 'Initial onboarding journey is complete and ready to roll into adoption tracking.'
  }
];
