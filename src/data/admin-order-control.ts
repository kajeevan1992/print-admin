export type AdminOrderControlStatus =
  | 'awaiting-artwork'
  | 'artwork-review'
  | 'awaiting-approval'
  | 'in-production'
  | 'quality-check'
  | 'ready-to-dispatch';

export type AdminOrderControlRecord = {
  id: string;
  customer: string;
  product: string;
  submittedAt: string;
  total: string;
  status: AdminOrderControlStatus;
  assignee: string;
  priority: 'standard' | 'rush';
};

export const adminOrderControlSeed: AdminOrderControlRecord[] = [
  {
    id: 'ORD-10483',
    customer: 'Nina Patel',
    product: 'A5 Flyers',
    submittedAt: '2026-04-17 10:42',
    total: '£58.00',
    status: 'artwork-review',
    assignee: 'Prepress Team',
    priority: 'rush'
  },
  {
    id: 'ORD-10482',
    customer: 'Alex Morgan',
    product: 'Standard Business Cards',
    submittedAt: '2026-04-17 09:18',
    total: '£37.00',
    status: 'in-production',
    assignee: 'Production Team',
    priority: 'standard'
  },
  {
    id: 'ORD-10484',
    customer: 'BluePeak Events',
    product: 'Postcard Mailers',
    submittedAt: '2026-04-16 15:03',
    total: '£69.00',
    status: 'quality-check',
    assignee: 'QA Team',
    priority: 'standard'
  },
  {
    id: 'ORD-10485',
    customer: 'Northstar Print',
    product: 'Mailer Boxes',
    submittedAt: '2026-04-17 12:10',
    total: '£129.00',
    status: 'awaiting-approval',
    assignee: 'Account Team',
    priority: 'rush'
  }
];
