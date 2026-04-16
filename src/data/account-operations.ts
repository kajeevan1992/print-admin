export type OrderStatus = 'in-production' | 'awaiting-approval' | 'shipped' | 'delivered';

export type TrackingStep = {
  title: string;
  status: 'done' | 'current' | 'upcoming';
  note: string;
};

export type ApprovalItem = {
  id: string;
  title: string;
  type: string;
  dueBy: string;
  status: 'needs-review' | 'approved' | 'changes-requested';
};

export const orderList = [
  {
    id: 'ORD-10482',
    title: 'Standard Business Cards',
    status: 'in-production' as OrderStatus,
    placedAt: '2026-04-16',
    total: '£37.00',
    delivery: '2–3 days'
  },
  {
    id: 'ORD-10471',
    title: 'A5 Flyers',
    status: 'awaiting-approval' as OrderStatus,
    placedAt: '2026-04-15',
    total: '£58.00',
    delivery: 'Pending approval'
  },
  {
    id: 'ORD-10426',
    title: 'Postcard Mailers',
    status: 'shipped' as OrderStatus,
    placedAt: '2026-04-12',
    total: '£69.00',
    delivery: 'Arriving tomorrow'
  },
  {
    id: 'ORD-10394',
    title: 'Roller Banners',
    status: 'delivered' as OrderStatus,
    placedAt: '2026-04-09',
    total: '£109.00',
    delivery: 'Delivered'
  }
];

export const trackingSteps: TrackingStep[] = [
  { title: 'Order received', status: 'done', note: 'Your order is confirmed and queued.' },
  { title: 'Artwork/prepress', status: 'done', note: 'Files checked and approved for production.' },
  { title: 'Production', status: 'current', note: 'Your product is currently being manufactured.' },
  { title: 'Dispatch', status: 'upcoming', note: 'Shipping details will appear here once dispatched.' },
  { title: 'Delivered', status: 'upcoming', note: 'Final delivery confirmation will appear here.' }
];

export const approvalItems: ApprovalItem[] = [
  {
    id: 'APR-3301',
    title: 'A5 Flyers proof',
    type: 'Artwork proof',
    dueBy: '2026-04-17',
    status: 'needs-review'
  },
  {
    id: 'APR-3298',
    title: 'Mailer box dieline review',
    type: 'Packaging approval',
    dueBy: '2026-04-18',
    status: 'changes-requested'
  },
  {
    id: 'APR-3271',
    title: 'Executive card refresh',
    type: 'Template sign-off',
    dueBy: '2026-04-14',
    status: 'approved'
  }
];
