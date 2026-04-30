import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ImpactStatus = 'estimated' | 'approved' | 'in-rework' | 'completed' | 'written-off';

type ReworkImpact = Record<string, any> & {
  id: string;
  exceptionId: string;
  jobId: string;
  orderNumber?: string;
  productName?: string;
  reason: string;
  status: ImpactStatus;
  extraMinutes: number;
  materialWasteMinor: number;
  labourCostMinor: number;
  machineCostMinor: number;
  totalImpactMinor: number;
  currency: string;
  customerChargeable: boolean;
  productionBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  notes: string[];
};

type ImpactAction = {
  id: string;
  impactId?: string;
  exceptionId?: string;
  action: string;
  at: string;
  note?: string;
};

let store: { items: ReworkImpact[]; actions: ImpactAction[] } = {
  items: [],
  actions: [],
};

const nowIso = () => new Date().toISOString();

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function toMinor(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function estimateFromException(item: any, index = 0): ReworkImpact {
  const createdAt = nowIso();
  const severity = String(item?.severity || 'medium').toLowerCase();
  const baseMinutes = severity === 'critical' ? 180 : severity === 'high' ? 120 : severity === 'medium' ? 60 : 30;
  const materialWasteMinor = severity === 'critical' ? 4500 : severity === 'high' ? 2500 : severity === 'medium' ? 1200 : 500;
  const labourCostMinor = baseMinutes * 45;
  const machineCostMinor = baseMinutes * 35;

  return {
    id: makeId('rework-impact'),
    exceptionId: String(item?.id || item?.exceptionId || `exception-${index + 1}`),
    jobId: String(item?.jobId || `job-${index + 1}`),
    orderNumber: String(item?.orderNumber || ''),
    productName: String(item?.productName || 'Production job'),
    reason: String(item?.issueType || 'production_rework'),
    status: 'estimated',
    extraMinutes: baseMinutes,
    materialWasteMinor,
    labourCostMinor,
    machineCostMinor,
    totalImpactMinor: materialWasteMinor + labourCostMinor + machineCostMinor,
    currency: 'GBP',
    customerChargeable: false,
    productionBlocked: true,
    createdAt,
    updatedAt: createdAt,
    notes: [String(item?.notes?.[0] || 'Rework impact estimated from production exception.')],
  };
}

function summary() {
  const active = store.items.filter((item) => !['completed', 'written-off'].includes(item.status));
  const totalImpactMinor = store.items.reduce((sum, item) => sum + Number(item.totalImpactMinor || 0), 0);
  const activeImpactMinor = active.reduce((sum, item) => sum + Number(item.totalImpactMinor || 0), 0);
  const extraMinutes = store.items.reduce((sum, item) => sum + Number(item.extraMinutes || 0), 0);
  return {
    total: store.items.length,
    active: active.length,
    estimated: store.items.filter((item) => item.status === 'estimated').length,
    approved: store.items.filter((item) => item.status === 'approved').length,
    inRework: store.items.filter((item) => item.status === 'in-rework').length,
    completed: store.items.filter((item) => item.status === 'completed').length,
    writtenOff: store.items.filter((item) => item.status === 'written-off').length,
    blocked: store.items.filter((item) => item.productionBlocked).length,
    extraMinutes,
    totalImpactMinor,
    activeImpactMinor,
    currency: 'GBP',
  };
}

function addAction(action: string, item?: ReworkImpact, note?: string) {
  const event: ImpactAction = {
    id: makeId('rework-impact-action'),
    impactId: item?.id,
    exceptionId: item?.exceptionId,
    action,
    at: nowIso(),
    note,
  };
  store.actions = [event, ...store.actions].slice(0, 200);
  return event;
}

function updateImpact(impactId: string, updater: (item: ReworkImpact) => ReworkImpact) {
  let updated: ReworkImpact | null = null;
  store.items = store.items.map((item) => {
    if (item.id !== impactId) return item;
    updated = updater(item);
    return updated;
  });
  return updated;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-rework-impact',
    data: {
      items: store.items,
      actions: store.actions,
      summary: summary(),
      supportedActions: ['estimate-from-exceptions', 'create-estimate', 'approve', 'start-rework', 'complete', 'write-off', 'mark-chargeable', 'clear'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'create-estimate');
    const now = nowIso();

    if (action === 'clear') {
      store = { items: [], actions: [] };
      return NextResponse.json({ ok: true, source: 'internal-production-rework-impact', data: { items: store.items, actions: store.actions, summary: summary() } });
    }

    if (action === 'estimate-from-exceptions') {
      const exceptions = Array.isArray(body.exceptions) ? body.exceptions : [];
      const candidates = exceptions.filter((item: any) => !['resolved', 'scrapped'].includes(String(item?.status || '').toLowerCase()));
      const nextItems = candidates.map(estimateFromException).slice(0, 100);
      store.items = [...nextItems, ...store.items].slice(0, 150);
      nextItems.forEach((item) => addAction('estimate-from-exceptions', item, 'Impact estimate created from exception queue.'));
      return NextResponse.json({ ok: true, source: 'internal-production-rework-impact', data: { items: store.items, actions: store.actions, summary: summary() } });
    }

    if (action === 'create-estimate') {
      const item: ReworkImpact = {
        id: makeId('rework-impact'),
        exceptionId: String(body.exceptionId || 'manual-exception'),
        jobId: String(body.jobId || 'manual-job'),
        orderNumber: String(body.orderNumber || ''),
        productName: String(body.productName || 'Production job'),
        reason: String(body.reason || 'manual_rework_estimate'),
        status: 'estimated',
        extraMinutes: toMinor(body.extraMinutes, 60),
        materialWasteMinor: toMinor(body.materialWasteMinor, 1500),
        labourCostMinor: toMinor(body.labourCostMinor, 2700),
        machineCostMinor: toMinor(body.machineCostMinor, 2100),
        totalImpactMinor: toMinor(body.totalImpactMinor, toMinor(body.materialWasteMinor, 1500) + toMinor(body.labourCostMinor, 2700) + toMinor(body.machineCostMinor, 2100)),
        currency: 'GBP',
        customerChargeable: Boolean(body.customerChargeable),
        productionBlocked: true,
        createdAt: now,
        updatedAt: now,
        notes: [String(body.note || 'Manual rework impact estimate created.')],
      };
      store.items = [item, ...store.items].slice(0, 150);
      addAction(action, item, item.notes[0]);
      return NextResponse.json({ ok: true, source: 'internal-production-rework-impact', data: { items: store.items, actions: store.actions, summary: summary() }, item });
    }

    const impactId = String(body.impactId || '');
    if (!impactId) return NextResponse.json({ ok: false, error: 'impactId is required' }, { status: 400 });

    const note = String(body.note || '').trim();
    const updated = updateImpact(impactId, (item) => {
      const notes = note ? [note, ...(item.notes || [])].slice(0, 20) : item.notes || [];
      if (action === 'approve') return { ...item, status: 'approved', productionBlocked: true, updatedAt: now, notes };
      if (action === 'start-rework') return { ...item, status: 'in-rework', productionBlocked: true, updatedAt: now, notes };
      if (action === 'complete') return { ...item, status: 'completed', productionBlocked: false, updatedAt: now, notes };
      if (action === 'write-off') return { ...item, status: 'written-off', productionBlocked: false, customerChargeable: false, updatedAt: now, notes };
      if (action === 'mark-chargeable') return { ...item, customerChargeable: true, updatedAt: now, notes };
      return { ...item, updatedAt: now, notes };
    });

    if (!updated) return NextResponse.json({ ok: false, error: 'Rework impact item not found' }, { status: 404 });
    addAction(action, updated, note);

    return NextResponse.json({ ok: true, source: 'internal-production-rework-impact', data: { items: store.items, actions: store.actions, summary: summary() }, item: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production rework impact update failed' }, { status: 500 });
  }
}
