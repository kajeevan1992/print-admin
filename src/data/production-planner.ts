export type PlannerPriority = 'low' | 'medium' | 'high';
export type PlannerStatus = 'draft' | 'ready' | 'blocked' | 'released';

export type PlannerRecord = {
  id: string;
  jobNumber: string;
  customer: string;
  product: string;
  plant: string;
  machine: string;
  plannedDate: string;
  estimatedHours: number;
  priority: PlannerPriority;
  status: PlannerStatus;
  route: string;
  owner: string;
  notes: string;
};

export const productionPlannerMock: PlannerRecord[] = [
  {
    id: 'pp-1001',
    jobNumber: 'ORD-32018',
    customer: 'Northwind Office',
    product: 'Premium Catalog A4',
    plant: 'London',
    machine: 'HP Indigo 7K',
    plannedDate: '2026-04-14',
    estimatedHours: 5.5,
    priority: 'high',
    status: 'ready',
    route: 'Prepress → Digital Print → Bindery → Dispatch',
    owner: 'Maya Singh',
    notes: 'Artwork is approved. Keep bindery slot protected because catalog spine trim is tight.'
  },
  {
    id: 'pp-1002',
    jobNumber: 'ORD-32044',
    customer: 'Nova Retail',
    product: 'Window Vinyl Kit',
    plant: 'Manchester',
    machine: 'EFI VUTEk Q5r',
    plannedDate: '2026-04-15',
    estimatedHours: 7,
    priority: 'medium',
    status: 'blocked',
    route: 'Artwork Check → Large Format → Finishing → Carrier Handover',
    owner: 'Tom Hargreaves',
    notes: 'Waiting for lamination stock confirmation before releasing to board.'
  },
  {
    id: 'pp-1003',
    jobNumber: 'ORD-32051',
    customer: 'Acme Office',
    product: 'Matte Business Cards',
    plant: 'Leeds',
    machine: 'Konica C14000',
    plannedDate: '2026-04-13',
    estimatedHours: 2.5,
    priority: 'low',
    status: 'draft',
    route: 'Digital Print → Guillotine → Pack',
    owner: 'Luca Evans',
    notes: 'Simple repeat work. Good candidate for a quick-fill gap in the daily schedule.'
  },
  {
    id: 'pp-1004',
    jobNumber: 'ORD-32060',
    customer: 'Bright Dental',
    product: 'Direct Mail Pack',
    plant: 'London',
    machine: 'HP Indigo 7K',
    plannedDate: '2026-04-16',
    estimatedHours: 6.5,
    priority: 'high',
    status: 'released',
    route: 'Proofing → Digital Print → Folding → Mailing',
    owner: 'Ari Patel',
    notes: 'Released to live board. Mailing timing is the main SLA driver.'
  }
];
