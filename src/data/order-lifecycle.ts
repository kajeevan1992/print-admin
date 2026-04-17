export type LifecycleStatus =
  | 'awaiting-payment'
  | 'artwork-check'
  | 'approved'
  | 'in-production'
  | 'quality-check'
  | 'dispatched'
  | 'delivered';

export type LifecycleOrder = {
  id: string;
  title: string;
  customer: string;
  placedAt: string;
  total: string;
  status: LifecycleStatus;
  eta: string;
};

export type LifecycleTimelineStep = {
  id: string;
  label: string;
  state: 'done' | 'current' | 'upcoming';
  note: string;
};

export const lifecycleOrders: LifecycleOrder[] = [
  {
    id: 'ORD-10482',
    title: 'Standard Business Cards',
    customer: 'Alex Morgan',
    placedAt: '2026-04-17 09:18',
    total: '£37.00',
    status: 'in-production',
    eta: '2026-04-19'
  },
  {
    id: 'ORD-10483',
    title: 'A5 Flyers',
    customer: 'Nina Patel',
    placedAt: '2026-04-17 10:42',
    total: '£58.00',
    status: 'artwork-check',
    eta: 'Pending approval'
  },
  {
    id: 'ORD-10484',
    title: 'Postcard Mailers',
    customer: 'BluePeak Events',
    placedAt: '2026-04-16 15:03',
    total: '£69.00',
    status: 'dispatched',
    eta: '2026-04-18'
  }
];

export const lifecycleTimeline: LifecycleTimelineStep[] = [
  {
    id: 'step-1',
    label: 'Order placed',
    state: 'done',
    note: 'The order has been submitted and accepted into the workflow.'
  },
  {
    id: 'step-2',
    label: 'Artwork & preflight',
    state: 'done',
    note: 'Artwork has been uploaded and preflight checks were completed.'
  },
  {
    id: 'step-3',
    label: 'Approval / payment clearance',
    state: 'done',
    note: 'Any required approval or payment hold has been cleared.'
  },
  {
    id: 'step-4',
    label: 'Production',
    state: 'current',
    note: 'The job is actively in production.'
  },
  {
    id: 'step-5',
    label: 'Quality check',
    state: 'upcoming',
    note: 'Final QA will run before dispatch.'
  },
  {
    id: 'step-6',
    label: 'Dispatch & delivery',
    state: 'upcoming',
    note: 'Tracking details will appear once the parcel is dispatched.'
  }
];
