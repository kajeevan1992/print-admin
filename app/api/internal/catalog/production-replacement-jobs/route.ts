import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ReplacementStatus = 'requested' | 'approved' | 'created' | 'scheduled' | 'in-production' | 'completed' | 'cancelled';

type ReplacementJob = Record<string, any> & {
  id: string;
  sourceImpactId: string;
  sourceExceptionId?: string;
  originalJobId: string;
  replacementJobId: string;
  orderNumber?: string;
  productName?: string;
  reason: string;
  status: ReplacementStatus;
  productionBlocked: boolean;
  requiresApproval: boolean;
  chargeableToCustomer: boolean;
  remakeQuantity: number;
  extraMinutes: number;
  estimatedCostMinor: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  notes: string[];
};

type ReplacementAction = {
  id: string;
  replacementId?: string;
  action: string;
  at: string;
  note?: string;
};

let store: { items: ReplacementJob[]; actions: ReplacementAction[] } = {
  items: [],
  actions: [],
};

const nowIso = () => new Date().toISOString();

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function toNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function replacementFromImpact(impact: any, index = 0): ReplacementJob {
  const now = nowIso();
  const originalJobId = String(impact?.jobId || `job-${index + 1}`);
  const estimatedCostMinor = toNumber(impact?.totalImpactMinor, 0);
  return {
    id: makeId('replacement'),
    sourceImpactId: String(impact?.id || `impact-${index + 1}`),
    sourceExceptionId: String(impact?.exceptionId || ''),
    originalJobId,
    replacementJobId: makeId(`remake-${originalJobId}`),
    orderNumber: String(impact?.orderNumber || ''),
    productName: String(impact?.productName || 'Replacement production job'),
    reason: String(impact?.reason || 'rework_replacement'),
    status: estimatedCostMinor > 0 ? 'requested' : 'approved',
    productionBlocked: true,
    requiresApproval: estimatedCostMinor > 0,
    chargeableToCustomer: Boolean(impact?.customerChargeable),
    remakeQuantity: toNumber(impact?.remakeQuantity || impact?.quantity, 1),
    extraMinutes: toNumber(impact?.extraMinutes, 60),
    estimatedCostMinor,
    currency: String(impact?.currency || 'GBP'),
    createdAt: now,
    updatedAt: now,
    notes: [String(impact?.notes?.[0] || 'Replacement job requested from approved rework impact.')],
  };
}

function summary() {
  return {
    total: store.items.length,
    requested: store.items.filter((item) => item.status === 'requested').length,
    approved: store.items.filter((item) => item.status === 'approved').length,
    created: store.items.filter((item) => item.status === 'created').length,
    scheduled: store.items.filter((item) => item.status === 'scheduled').length,
    inProduction: store.items.filter((item) => item.status === 'in-production').length,
    completed: store.items.filter((item) => item.status === 'completed').length,
    cancelled: store.items.filter((item) => item.status === 'cancelled').length,
    blocked: store.items.filter((item) => item.productionBlocked).length,
    chargeable: store.items.filter((item) => item.chargeableToCustomer).length,
    estimatedCostMinor: store.items.reduce((sum, item) => sum + Number(item.estimatedCostMinor || 0), 0),
    extraMinutes: store.items.reduce((sum, item) => sum + Number(item.extraMinutes || 0), 0),
    currency: 'GBP',
  };
}

function addAction(action: string, item?: ReplacementJob, note?: string) {
  const event: ReplacementAction = {
    id: makeId('replacement-action'),
    replacementId: item?.id,
    action,
    at: nowIso(),
    note,
  };
  store.actions = [event, ...store.actions].slice(0, 200);
  return event;
}

function updateReplacement(replacementId: string, updater: (item: ReplacementJob) => ReplacementJob) {
  let updated: ReplacementJob | null = null;
  store.items = store.items.map((item) => {
    if (item.id !== replacementId) return item;
    updated = updater(item);
    return updated;
  });
  return updated;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-replacement-jobs',
    data: {
      items: store.items,
      actions: store.actions,
      summary: summary(),
      supportedActions: ['create-from-rework-impact', 'create-manual', 'approve', 'create-job', 'schedule', 'start-production', 'complete', 'cancel', 'clear'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'create-manual');
    const now = nowIso();

    if (action === 'clear') {
      store = { items: [], actions: [] };
      return NextResponse.json({ ok: true, source: 'internal-production-replacement-jobs', data: { items: store.items, actions: store.actions, summary: summary() } });
    }

    if (action === 'create-from-rework-impact') {
      const impacts = Array.isArray(body.impacts) ? body.impacts : [];
      const candidates = impacts.filter((impact: any) => ['approved', 'in-rework', 'completed'].includes(String(impact?.status || '').toLowerCase()));
      const existingImpactIds = new Set(store.items.map((item) => item.sourceImpactId));
      const nextItems = candidates
        .filter((impact: any) => !existingImpactIds.has(String(impact?.id || '')))
        .map(replacementFromImpact)
        .slice(0, 100);
      store.items = [...nextItems, ...store.items].slice(0, 150);
      nextItems.forEach((item) => addAction('create-from-rework-impact', item, 'Replacement job generated from rework impact.'));
      return NextResponse.json({ ok: true, source: 'internal-production-replacement-jobs', data: { items: store.items, actions: store.actions, summary: summary() } });
    }

    if (action === 'create-manual') {
      const item: ReplacementJob = {
        id: makeId('replacement'),
        sourceImpactId: String(body.sourceImpactId || 'manual-impact'),
        sourceExceptionId: String(body.sourceExceptionId || ''),
        originalJobId: String(body.originalJobId || 'manual-job'),
        replacementJobId: makeId(`remake-${String(body.originalJobId || 'manual-job')}`),
        orderNumber: String(body.orderNumber || ''),
        productName: String(body.productName || 'Manual replacement job'),
        reason: String(body.reason || 'manual_replacement'),
        status: 'requested',
        productionBlocked: true,
        requiresApproval: true,
        chargeableToCustomer: Boolean(body.chargeableToCustomer),
        remakeQuantity: toNumber(body.remakeQuantity, 1),
        extraMinutes: toNumber(body.extraMinutes, 60),
        estimatedCostMinor: toNumber(body.estimatedCostMinor, 3500),
        currency: 'GBP',
        createdAt: now,
        updatedAt: now,
        notes: [String(body.note || 'Manual replacement job requested.')],
      };
      store.items = [item, ...store.items].slice(0, 150);
      addAction(action, item, item.notes[0]);
      return NextResponse.json({ ok: true, source: 'internal-production-replacement-jobs', data: { items: store.items, actions: store.actions, summary: summary() }, item });
    }

    const replacementId = String(body.replacementId || '');
    if (!replacementId) return NextResponse.json({ ok: false, error: 'replacementId is required' }, { status: 400 });

    const note = String(body.note || '').trim();
    const updated = updateReplacement(replacementId, (item) => {
      const notes = note ? [note, ...(item.notes || [])].slice(0, 20) : item.notes || [];
      if (action === 'approve') return { ...item, status: 'approved', requiresApproval: false, productionBlocked: true, updatedAt: now, notes };
      if (action === 'create-job') return { ...item, status: 'created', productionBlocked: false, updatedAt: now, notes };
      if (action === 'schedule') return { ...item, status: 'scheduled', productionBlocked: false, updatedAt: now, notes };
      if (action === 'start-production') return { ...item, status: 'in-production', productionBlocked: false, updatedAt: now, notes };
      if (action === 'complete') return { ...item, status: 'completed', productionBlocked: false, updatedAt: now, notes };
      if (action === 'cancel') return { ...item, status: 'cancelled', productionBlocked: false, updatedAt: now, notes };
      return { ...item, updatedAt: now, notes };
    });

    if (!updated) return NextResponse.json({ ok: false, error: 'Replacement job not found' }, { status: 404 });
    addAction(action, updated, note);

    return NextResponse.json({ ok: true, source: 'internal-production-replacement-jobs', data: { items: store.items, actions: store.actions, summary: summary() }, item: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production replacement job update failed' }, { status: 500 });
  }
}
