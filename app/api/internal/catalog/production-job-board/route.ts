import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type BoardStatus = 'blocked' | 'ready' | 'queued' | 'in-production' | 'paused' | 'done';
type BoardJob = {
  id: string;
  orderNumber: string;
  productName: string;
  jobType: 'print' | 'finishing' | 'artwork' | 'dispatch';
  stage: string;
  status: BoardStatus;
  priority: 'normal' | 'rush' | 'urgent';
  lane: string;
  machineKey?: string;
  assignee?: string;
  dueAt?: string;
  productionBlocked: boolean;
  blockReason?: string;
  updatedAt: string;
  history: Array<{ at: string; action: string; note?: string }>;
};

const nowIso = () => new Date().toISOString();
const dueIso = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

let boardStore: { items: BoardJob[]; actions: any[] } = {
  items: [
    {
      id: 'board-job-print-001',
      orderNumber: 'ORD-DEMO-001',
      productName: 'Demo Business Cards',
      jobType: 'print',
      stage: 'print',
      status: 'ready',
      priority: 'normal',
      lane: 'digital-print',
      machineKey: 'konica_c4070',
      assignee: 'Print Operator',
      dueAt: dueIso(24),
      productionBlocked: false,
      updatedAt: nowIso(),
      history: [{ at: nowIso(), action: 'seeded', note: 'Ready print job on board.' }],
    },
    {
      id: 'board-job-finish-001',
      orderNumber: 'ORD-DEMO-001',
      productName: 'Demo Business Cards',
      jobType: 'finishing',
      stage: 'finishing',
      status: 'blocked',
      priority: 'normal',
      lane: 'finishing',
      machineKey: 'finishing_bench',
      assignee: 'Finishing Operator',
      dueAt: dueIso(30),
      productionBlocked: true,
      blockReason: 'Waiting for print job completion.',
      updatedAt: nowIso(),
      history: [{ at: nowIso(), action: 'seeded', note: 'Blocked finishing job on board.' }],
    },
  ],
  actions: [],
};

function summary(items: BoardJob[]) {
  return {
    total: items.length,
    blocked: items.filter((item) => item.status === 'blocked' || item.productionBlocked).length,
    ready: items.filter((item) => item.status === 'ready').length,
    queued: items.filter((item) => item.status === 'queued').length,
    inProduction: items.filter((item) => item.status === 'in-production').length,
    paused: items.filter((item) => item.status === 'paused').length,
    done: items.filter((item) => item.status === 'done').length,
    urgent: items.filter((item) => item.priority === 'urgent' || item.priority === 'rush').length,
    lanes: Array.from(new Set(items.map((item) => item.lane))).length,
  };
}

function lanes(items: BoardJob[]) {
  return ['blocked', 'ready', 'queued', 'in-production', 'paused', 'done'].map((status) => ({
    status,
    items: items.filter((item) => item.status === status),
  }));
}

function updateJob(job: BoardJob, action: string, note?: string): BoardJob {
  let status = job.status;
  let productionBlocked = job.productionBlocked;
  let blockReason = job.blockReason;
  let priority = job.priority;

  if (action === 'queue') {
    if (productionBlocked) {
      status = 'blocked';
      blockReason = blockReason || 'Cannot queue blocked job.';
    } else {
      status = 'queued';
    }
  }
  if (action === 'start') {
    if (productionBlocked) {
      status = 'blocked';
      blockReason = blockReason || 'Cannot start blocked job.';
    } else {
      status = 'in-production';
    }
  }
  if (action === 'pause') status = 'paused';
  if (action === 'resume') status = productionBlocked ? 'blocked' : 'queued';
  if (action === 'complete') status = 'done';
  if (action === 'block') {
    status = 'blocked';
    productionBlocked = true;
    blockReason = note || 'Blocked from production board.';
  }
  if (action === 'clear-block') {
    productionBlocked = false;
    blockReason = undefined;
    status = 'ready';
  }
  if (action === 'rush') priority = 'rush';
  if (action === 'urgent') priority = 'urgent';
  if (action === 'normal-priority') priority = 'normal';

  const updatedAt = nowIso();
  return {
    ...job,
    status,
    productionBlocked,
    blockReason,
    priority,
    updatedAt,
    history: [{ at: updatedAt, action, note }, ...(job.history || [])].slice(0, 25),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-job-board',
    data: {
      items: boardStore.items,
      lanes: lanes(boardStore.items),
      actions: boardStore.actions,
      summary: summary(boardStore.items),
      boardActions: ['queue', 'start', 'pause', 'resume', 'complete', 'block', 'clear-block', 'rush', 'urgent', 'normal-priority'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'queue');
    const now = nowIso();

    if (action === 'seed-from-production-jobs') {
      const incoming = Array.isArray(body.jobs) ? body.jobs : [];
      const mapped = incoming.slice(0, 20).map((job: any, index: number): BoardJob => ({
        id: `board-${String(job.id || Date.now() + index)}`,
        orderNumber: String(job.orderNumber || job.orderId || 'ORD-BOARD'),
        productName: String(job.productName || 'Production Job'),
        jobType: String(job.jobType || 'print') as BoardJob['jobType'],
        stage: String(job.stage || job.productionStage || 'production'),
        status: job.productionBlocked || job.status === 'blocked' ? 'blocked' : String(job.status || 'ready') as BoardStatus,
        priority: 'normal',
        lane: String(job.stage || job.jobType || 'production'),
        machineKey: job.machineKey ? String(job.machineKey) : undefined,
        assignee: 'Unassigned',
        dueAt: job.dueAt ? String(job.dueAt) : dueIso(24 + index),
        productionBlocked: Boolean(job.productionBlocked || job.status === 'blocked'),
        blockReason: job.blockReason ? String(job.blockReason) : undefined,
        updatedAt: now,
        history: [{ at: now, action: 'seed-from-production-jobs', note: 'Imported from split production jobs.' }],
      }));
      boardStore.items = [...mapped, ...boardStore.items].slice(0, 100);
    } else {
      const jobId = String(body.jobId || body.id || '');
      const index = boardStore.items.findIndex((job) => job.id === jobId);
      if (index < 0) return NextResponse.json({ ok: false, error: 'Board job not found' }, { status: 404 });
      boardStore.items[index] = updateJob(boardStore.items[index], action, body.note ? String(body.note) : undefined);
    }

    boardStore.actions = [{ id: `board-action-${Date.now()}`, action, jobId: body.jobId || body.id || null, at: now }, ...boardStore.actions].slice(0, 100);
    return NextResponse.json({ ok: true, source: 'internal-production-job-board', data: { items: boardStore.items, lanes: lanes(boardStore.items), actions: boardStore.actions, summary: summary(boardStore.items) }, item: boardStore.items.find((job) => job.id === String(body.jobId || body.id || '')) || null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production board update failed' }, { status: 500 });
  }
}
