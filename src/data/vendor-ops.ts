export type VendorHealth = 'healthy' | 'watch' | 'critical';
export type VendorStatus = 'active' | 'onboarding' | 'paused';
export type VendorCategory = 'Print' | 'Finishing' | 'Packaging' | 'Freight';

export type VendorRecord = {
  id: string;
  name: string;
  category: VendorCategory;
  region: string;
  status: VendorStatus;
  health: VendorHealth;
  leadDays: number;
  onTimeRate: number;
  spendMtd: number;
  capability: string;
  accountOwner: string;
  notes: string;
};

export const vendorRecordsMock: VendorRecord[] = [
  {
    id: 'vd-1001',
    name: 'North Shore Print Partners',
    category: 'Print',
    region: 'North',
    status: 'active',
    health: 'healthy',
    leadDays: 3,
    onTimeRate: 98,
    spendMtd: 18400,
    capability: 'Litho and digital trade print',
    accountOwner: 'S. Patel',
    notes: 'Primary overflow trade printer for catalog and brochure work.'
  },
  {
    id: 'vd-1002',
    name: 'Falcon Finish House',
    category: 'Finishing',
    region: 'Midlands',
    status: 'active',
    health: 'watch',
    leadDays: 4,
    onTimeRate: 89,
    spendMtd: 9600,
    capability: 'Foiling, lamination, and hand finishing',
    accountOwner: 'R. Taylor',
    notes: 'Useful for premium jobs but recent foil delays need monitoring.'
  },
  {
    id: 'vd-1003',
    name: 'Boxline Packaging Co',
    category: 'Packaging',
    region: 'South',
    status: 'onboarding',
    health: 'healthy',
    leadDays: 6,
    onTimeRate: 0,
    spendMtd: 2400,
    capability: 'Mailer boxes and custom packaging inserts',
    accountOwner: 'L. Wong',
    notes: 'In qualification phase for seasonal packaging programmes.'
  },
  {
    id: 'vd-1004',
    name: 'Rapid Route Freight',
    category: 'Freight',
    region: 'National',
    status: 'paused',
    health: 'critical',
    leadDays: 2,
    onTimeRate: 76,
    spendMtd: 4100,
    capability: 'Same-day and regional pallet dispatch',
    accountOwner: 'M. Evans',
    notes: 'Paused after repeated missed handovers on enterprise work.'
  }
];
