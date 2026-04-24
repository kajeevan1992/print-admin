
export type OwnerEscalationStatus = 'open' | 'monitoring' | 'resolved';
export type OwnerEscalationScope = 'customer' | 'billing' | 'technical';

export type OwnerEscalationRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerEscalationScope;
  status: OwnerEscalationStatus;
  severity: string;
  owner: string;
  dueDate: string;
  summary: string;
};

export const ownerEscalationSeed: OwnerEscalationRecord[] = [
  {
    id: 'escalation-1',
    tenant: 'Northstar Print',
    title: 'Executive pricing exception review',
    scope: 'billing',
    status: 'open',
    severity: 'High',
    owner: 'Owner Ops',
    dueDate: '2026-04-21',
    summary: 'Escalation opened to resolve a pricing exception before expansion approval.'
  },
  {
    id: 'escalation-2',
    tenant: 'BluePeak Mailers',
    title: 'Renewal risk sponsor escalation',
    scope: 'customer',
    status: 'monitoring',
    severity: 'Medium',
    owner: 'Finance Admin',
    dueDate: '2026-04-24',
    summary: 'Monitoring sponsor engagement after renewal risk discussion and billing review.'
  },
  {
    id: 'escalation-3',
    tenant: 'PixelPress Studio',
    title: 'Launch blocker technical escalation',
    scope: 'technical',
    status: 'resolved',
    severity: 'High',
    owner: 'Support Admin',
    dueDate: '2026-04-16',
    summary: 'Technical blocker was escalated and resolved ahead of launch validation.'
  }
];
