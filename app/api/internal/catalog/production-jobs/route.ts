import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type JobStatus = 'pending-preflight' | 'blocked' | 'ready' | 'queued' | 'in-production' | 'done';
type JobType = 'print' | 'finishing' | 'artwork' | 'dispatch';

type ProductionJob = {
  id: string;
  orderId: string;
  orderNumber: string;
  parentWorkflowId?: string;
  productName: string;
  jobType: JobType;
  stage: string;
  status: JobStatus;
  quantity: number;
  materialKey?: string;
  machineKey?: string;
  preflightStatus: 'pending' | 'pass' | 'fail' | 'override';
  productionBlocked: boolean;
  blockReason?: string;
  assignedTo?: string;
  dueAt?: string;
  updatedAt: string;
  history: Array<{ at: string; action: string; note?: string }>;
};

const nowIso = () => new Date().toISOString();
const tomorrowIso = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

let productionJobStore: { items: ProductionJob[]; actions: any[] } = {
  items: [
    {
      id: 'job-demo-print-001',
      orderId: 'order-demo-001',
      orderNumber: 'ORD-DEMO-001',
      parentWorkflowId: 'workflow-demo-001',
      productName: 'Demo Business Cards',
      jobType: 'print',
      stage: 'print',
      status: 'blocked',
      quantity: 1000,
      materialKey: '350gsm_silk',
      machineKey: 'konica_c4070',
      preflightStatus: 'pending',
      productionBlocked: true,
      blockReason: 'Preflight approval required before print job release.',
      dueAt: tomorrowIso(),
      updatedAt: nowIso(),
      history: [{ at: nowIso(), action: 'created', note: 'Demo split print job.' }],
    },
    {
      id: 'job-demo-finish-001',
      orderId: 'order-demo-001',
      orderNumber: 'ORD-DEMO-001',
      parentWorkflowId: 'workflow-demo-001',
      productName: 'Demo Business Cards',
      jobType: 'finishing',
      stage: 'finishing',
      status: 'blocked',
      quantity: 1000,
      materialKey: 'lamination_soft_touch',
      machineKey: 'finishing_bench',
      preflightStatus: 'pending',
      productionBlocked: true,
      blockReason: 'Print job and preflight must be ready before finishing.',
      dueAt: tomorrowIso(),
      updatedAt: nowIso(),
      history: [{ at: nowIso(), action: 'created', note: 'Demo split finishing job.' }],
    },
  ],
  actions: [],
};

function summary(items: ProductionJob[]) {
  return {
    total: items.length,
    blocked: items.filter((job) => job.productionBlocked || job.status === 'blocked').length,
    ready: items.filter((job) => job.status === 'ready').length,
    queued: items.filter((job) => job.status === 'queued').length,
    inProduction: items.filter((job) => job.status === 'in-production').length,
    done: items.filter((job) => job.status === 'done').length,
    print: items.filter((job) => job.jobType === 'print').length,
    finishing: items.filter((job) => job.jobType === 'finishing').length,
  };
}

function createJobsFromOrder(body: any): ProductionJob[] {
  const createdAt = nowIso();
  const orderId = String(body.orderId || `order-${Date.now()}`);
  const orderNumber = String(body.orderNumber || `ORD-${Date.now()}`);
  const productName = String(body.productName || 'Storefront Product');
  const quantity = Number(body.quantity || 1);
  const preflightStatus = String(body.preflightStatus || 'pending') as ProductionJob['preflightStatus'];
  const productionBlocked = !(preflightStatus === 'pass' || preflightStatus === 'override');
  const base = {
    orderId,
    orderNumber,
    parentWorkflowId: body.workflowId ? String(body.workflowId) : undefined,
    productName,
    quantity,
    preflightStatus,
    productionBlocked,
    blockReason: productionBlocked ? 'Preflight pass or manager override required.' : undefined,
    dueAt: body.dueAt ? String(body.dueAt) : tomorrowIso(),
    updatedAt: createdAt,
  };

  return [
    {
      ...base,
      id: `job-print-${Date.now()}`,
      jobType: 'print',
      stage: 'print',
      status: productionBlocked ? 'blocked' : 'ready',
      materialKey: String(body.materialKey || 'selected_material'),
      machineKey: String(body.machineKey || 'assigned_machine'),
      history: [{ at: createdAt, action: 'split-order', note: 'Print job created from order.' }],
    },
    {
      ...base,
      id: `job-finish-${Date.now()}`,
      jobType: 'finishing',
      stage: 'finishing',
      status: productionBlocked ? 'blocked' : 'ready',
      materialKey: String(body.finishKey || 'selected_finishing'),
      machineKey: String(body.finishingMachineKey || 'finishing_bench'),
      history: [{ at: createdAt, action: 'split-order', note: 'Finishing job created from order.' }],
    },
  ];
}

function updateJob(job: ProductionJob, action: string, note?: string): ProductionJob {
  let status = job.status;
  let productionBlocked = job.productionBlocked;
  let preflightStatus = job.preflightStatus;
  let blockReason = job.blockReason;

  if (action === 'mark-preflight-pass') {
    preflightStatus = 'pass';
    productionBlocked = false;
    blockReason = undefined;
    status = 'ready';
  }

  if (action === 'block') {
    productionBlocked = true;
    blockReason = note || 'Job blocked by operator.';
    status = 'blocked';
  }

  if (action === 'release') {
    if (productionBlocked && preflightStatus !== 'pass' && preflightStatus !== 'override') {
      status = 'blocked';
      blockReason = 'Cannot release without preflight pass or override.';
    } else {
      productionBlocked = false;
      blockReason = undefined;
      status = 'queued';
    }
  }

  if (action === 'start') status = 'in-production';
  if (action === 'complete') status = 'done';

  const updatedAt = nowIso();
  return {
    ...job,
    status,
    productionBlocked,
    preflightStatus,
    blockReason,
    updatedAt,
    history: [{ at: updatedAt, action, note }, ...(job.history || [])].slice(0, 30),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-jobs',
    data: {
      items: productionJobStore.items,
      actions: productionJobStore.actions,
      summary: summary(productionJobStore.items),
      statuses: ['pending-preflight', 'blocked', 'ready', 'queued', 'in-production', 'done'],
      jobTypes: ['print', 'finishing', 'artwork', 'dispatch'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'split-demo-order');
    const now = nowIso();

    if (action === 'split-demo-order' || action === 'split-order') {
      const jobs = createJobsFromOrder(body);
      productionJobStore.items = [...jobs, ...productionJobStore.items].slice(0, 100);
      productionJobStore.actions = [{ id: `production-job-action-${Date.now()}`, action, jobIds: jobs.map((job) => job.id), at: now }, ...productionJobStore.actions].slice(0, 100);
      return NextResponse.json({ ok: true, source: 'internal-production-jobs', items: jobs, data: { items: productionJobStore.items, actions: productionJobStore.actions, summary: summary(productionJobStore.items) } });
    }

    const jobId = String(body.jobId || body.id || '');
    const index = productionJobStore.items.findIndex((job) => job.id === jobId);
    if (index < 0) return NextResponse.json({ ok: false, error: 'Production job not found' }, { status: 404 });

    const updated = updateJob(productionJobStore.items[index], action, body.note ? String(body.note) : undefined);
    productionJobStore.items[index] = updated;
    productionJobStore.actions = [{ id: `production-job-action-${Date.now()}`, action, jobId: updated.id, at: updated.updatedAt }, ...productionJobStore.actions].slice(0, 100);

    return NextResponse.json({ ok: true, source: 'internal-production-jobs', item: updated, data: { items: productionJobStore.items, actions: productionJobStore.actions, summary: summary(productionJobStore.items) } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production job update failed' }, { status: 500 });
  }
}
