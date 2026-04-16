export type AccountOrder = {
  id: string;
  title: string;
  status: 'in-production' | 'awaiting-approval' | 'shipped' | 'delivered';
  placedAt: string;
  total: string;
};

export type SavedProject = {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
};

export const recentOrders: AccountOrder[] = [
  {
    id: 'ORD-10482',
    title: 'Standard Business Cards',
    status: 'in-production',
    placedAt: '2026-04-16',
    total: '£37.00'
  },
  {
    id: 'ORD-10471',
    title: 'A5 Flyers',
    status: 'awaiting-approval',
    placedAt: '2026-04-15',
    total: '£58.00'
  },
  {
    id: 'ORD-10426',
    title: 'Postcard Mailers',
    status: 'shipped',
    placedAt: '2026-04-12',
    total: '£69.00'
  }
];

export const savedProjects: SavedProject[] = [
  {
    id: 'PRJ-201',
    name: 'Spring campaign flyer',
    type: 'Template project',
    updatedAt: '2026-04-16'
  },
  {
    id: 'PRJ-188',
    name: 'Executive card refresh',
    type: 'Upload artwork',
    updatedAt: '2026-04-14'
  },
  {
    id: 'PRJ-177',
    name: 'Mailer box concept',
    type: 'Quote-led packaging',
    updatedAt: '2026-04-11'
  }
];
