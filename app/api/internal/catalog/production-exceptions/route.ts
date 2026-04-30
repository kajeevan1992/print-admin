import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ExceptionStatus = 'open' | 'rework-required' | 'waiting-manager' | 'resolved' | 'scrapped';

type ProductionException = Record<string, any> & {
  id: string;
  jobId: string;
  orderNumber?: string;
  productName?: string;
  machineKey?: string;
  operatorId?: string;
  issueType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: ExceptionStatus;
  productionBlocked: boolean;
  reworkJobId?: string;
  createdAt: string;
  updatedAt: string;
  notes: string[];
};

type ExceptionAction = {
  id: string;
  exceptionId?: string;
  jobId?: string;
  action: string;
  at: string;
  note?: string;
};

let store: { items: ProductionException[]; actions: ExceptionAction[] } = {
  items: [],
  actions: [],
};

const nowIso = () => new Date().toISOString();

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeSeverity(value: any): ProductionException['severity'] {
  const severity = String(value || '').toLowerCase();
  if (severity === 'critical' || severity === 'high' || severity === 'medium' || severity === 'low') return severity;
  return 'medium';
}

function issueFromJob(job: any) {
  if (job?.productionBlocked) return 'production_block';
  if (String(job?.executionStatus || job?.status || '').toLowerCase() === 'blocked') return 'execution_block';
  if (Number(job?.progressPercent || 0) < 100 && String(job?.status || '').toLowerCase().includes('complete')) return 'progress_mismatch';
  return 'manual_exception';
}

function exceptionFromJob(job: any, index = 0): ProductionException {
  const createdAt = nowIso();
  const jobId = String(job?.id || job?.jobId || `job-${index + 1}`);
  const issueType = issueFromJob(job);
  const severity = job?.productionBlocked || issueType === 'execution_block' ? 'high' : 'medium';
  return {
    id: makeId('exception'),
    jobId,
    orderNumber: String(job?.orderNumber || ''),
    productName: String(job?.productName || job?.name || 'Production job'),
    machineKey: String(job?.machineKey || job?.machine || ''),
    operatorId: String(job?.operatorId || job?.assignee || ''),
    issueType,
    severity,
    status: 'open',
    productionBlocked: true,
    createdAt,
    updatedAt: createdAt,
    notes: [String(job?.blockReason || job?.note || 'Production exception opened from workflow.')],
  };
}

function summary() {
  const openItems = store.items.filter((item) => !['resolved', 'scrapped'].includes(item.status));
  return {
    total: store.items.length,
    open: store.items.filter((item) => item.status === 'open').length,
    reworkRequired: store.items.filter((item) => item.status === 'rework-required').length,
    waitingManager: store.items.filter((item) => item.status === 'waiting-manager').length,
    resolved: store.items.filter((item) => item.status === 'resolved').length,
    scrapped: store.items.filter((item) => item.status === 'scrapped').length,
    blocked: store.items.filter((item) => item.productionBlocked).length,
    critical: store.items.filter((item) => item.severity === 'critical').length,
    active: openItems.length,
  };
}

function addAction(action: string, item?: ProductionException, note?: string) {
  const event: ExceptionAction = {
    id: makeId('exception-action'),
    exceptionId: item?.id,
    jobId: item?.jobId,
    action,
    at: nowIso(),
    note,
  };
  store.actions = [event, ...store.actions].slice(0, 200);
  return event;
}

function updateException(exceptionId: string, updater: (item: ProductionException) => ProductionException) {
  let updated: ProductionException | null = null;
  store.items = store.items.map((item) => {
    if (item.id !== exceptionId) return item;
    updated = updater(item);
    return updated;
  });
  return updated;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-exceptions',
    data: {
      items: store.items,
      actions: store.actions,
      summary: summary(),
      supportedActions: ['seed-from-jobs', 'open-exception', 'mark-rework', 'request-manager', 'resolve', 'scrap', 'clear'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'open-exception');
    const now = nowIso();

    if (action === 'clear') {
      store = { items: [], actions: [] };
      return NextResponse.json({ ok: true, source: 'internal-production-exceptions', data: { items: store.items, actions: store.actions, summary: summary() } });
    }

    if (action === 'seed-from-jobs') {
      const jobs = Array.isArray(body.jobs) ? body.jobs : [];
      const exceptionJobs = jobs.filter((job: any) => Boolean(job?.productionBlocked) || String(job?.status || job?.executionStatus || '').toLowerCase().includes('blocked'));
      const nextItems = exceptionJobs.map(exceptionFromJob).slice(0, 100);
      store.items = [...nextItems, ...store.items].slice(0, 150);
      nextItems.forEach((item) => addAction('seed-from-jobs', item, 'Exception seeded from blocked production job.'));
      return NextResponse.json({ ok: true, source: 'internal-production-exceptions', data: { items: store.items, actions: store.actions, summary: summary() } });
    }

    if (action === 'open-exception') {
      const jobId = String(body.jobId || body.id || 'manual-job');
      const item: ProductionException = {
        id: makeId('exception'),
        jobId,
        orderNumber: String(body.orderNumber || ''),
        productName: String(body.productName || 'Production job'),
        machineKey: String(body.machineKey || ''),
        operatorId: String(body.operatorId || ''),
        issueType: String(body.issueType || 'manual_exception'),
        severity: normalizeSeverity(body.severity || 'medium'),
        status: 'open',
        productionBlocked: true,
        createdAt: now,
        updatedAt: now,
        notes: [String(body.note || 'Manual production exception opened.')],
      };
      store.items = [item, ...store.items].slice(0, 150);
      addAction(action, item, item.notes[0]);
      return NextResponse.json({ ok: true, source: 'internal-production-exceptions', data: { items: store.items, actions: store.actions, summary: summary() }, item });
    }

    const exceptionId = String(body.exceptionId || '');
    if (!exceptionId) return NextResponse.json({ ok: false, error: 'exceptionId is required' }, { status: 400 });

    const note = String(body.note || '').trim();
    const updated = updateException(exceptionId, (item) => {
      const notes = note ? [note, ...(item.notes || [])].slice(0, 20) : item.notes || [];
      if (action === 'mark-rework') {
        return { ...item, status: 'rework-required', productionBlocked: true, reworkJobId: item.reworkJobId || makeId(`rework-${item.jobId}`), updatedAt: now, notes };
      }
      if (action === 'request-manager') {
        return { ...item, status: 'waiting-manager', productionBlocked: true, updatedAt: now, notes };
      }
      if (action === 'resolve') {
        return { ...item, status: 'resolved', productionBlocked: false, updatedAt: now, notes };
      }
      if (action === 'scrap') {
        return { ...item, status: 'scrapped', productionBlocked: false, updatedAt: now, notes };
      }
      return { ...item, updatedAt: now, notes };
    });

    if (!updated) return NextResponse.json({ ok: false, error: 'Exception not found' }, { status: 404 });
    addAction(action, updated, note);

    return NextResponse.json({ ok: true, source: 'internal-production-exceptions', data: { items: store.items, actions: store.actions, summary: summary() }, item: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production exception update failed' }, { status: 500 });
  }
}
