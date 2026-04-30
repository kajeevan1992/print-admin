import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ReplacementQcStatus = 'pending' | 'in-qc' | 'passed' | 'failed' | 'rework-loop' | 'accepted' | 'closed';

type ReplacementQcItem = Record<string, any> & {
  id: string;
  replacementId: string;
  replacementJobId: string;
  originalJobId?: string;
  orderNumber?: string;
  productName?: string;
  status: ReplacementQcStatus;
  checks: Array<{ key: string; label: string; status: 'pending' | 'pass' | 'fail'; note?: string }>;
  failedChecks: string[];
  requiresManagerReview: boolean;
  dispatchAllowed: boolean;
  reworkLoopRequired: boolean;
  createdAt: string;
  updatedAt: string;
  notes: string[];
};

type ReplacementQcAction = {
  id: string;
  qcId?: string;
  action: string;
  at: string;
  note?: string;
};

let store: { items: ReplacementQcItem[]; actions: ReplacementQcAction[] } = {
  items: [],
  actions: [],
};

const nowIso = () => new Date().toISOString();

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function defaultChecks() {
  return [
    { key: 'quantity', label: 'Replacement quantity matches remake request', status: 'pending' as const },
    { key: 'artwork', label: 'Correct artwork/version used', status: 'pending' as const },
    { key: 'colour', label: 'Colour/print quality accepted', status: 'pending' as const },
    { key: 'finish', label: 'Finishing/lamination/cutting accepted', status: 'pending' as const },
    { key: 'packing', label: 'Packing handoff ready', status: 'pending' as const },
  ];
}

function qcFromReplacement(replacement: any): ReplacementQcItem {
  const now = nowIso();
  return {
    id: makeId('replacement-qc'),
    replacementId: String(replacement?.id || ''),
    replacementJobId: String(replacement?.replacementJobId || replacement?.id || ''),
    originalJobId: String(replacement?.originalJobId || ''),
    orderNumber: String(replacement?.orderNumber || ''),
    productName: String(replacement?.productName || 'Replacement production job'),
    status: 'pending',
    checks: defaultChecks(),
    failedChecks: [],
    requiresManagerReview: false,
    dispatchAllowed: false,
    reworkLoopRequired: false,
    createdAt: now,
    updatedAt: now,
    notes: ['Replacement QC created from completed replacement/remake job.'],
  };
}

function addAction(action: string, item?: ReplacementQcItem, note?: string) {
  const event: ReplacementQcAction = {
    id: makeId('replacement-qc-action'),
    qcId: item?.id,
    action,
    at: nowIso(),
    note,
  };
  store.actions = [event, ...store.actions].slice(0, 200);
  return event;
}

function summary() {
  return {
    total: store.items.length,
    pending: store.items.filter((item) => item.status === 'pending').length,
    inQc: store.items.filter((item) => item.status === 'in-qc').length,
    passed: store.items.filter((item) => item.status === 'passed').length,
    failed: store.items.filter((item) => item.status === 'failed').length,
    reworkLoop: store.items.filter((item) => item.status === 'rework-loop').length,
    accepted: store.items.filter((item) => item.status === 'accepted').length,
    dispatchAllowed: store.items.filter((item) => item.dispatchAllowed).length,
    managerReview: store.items.filter((item) => item.requiresManagerReview).length,
  };
}

function recalc(item: ReplacementQcItem): ReplacementQcItem {
  const failedChecks = (item.checks || []).filter((check) => check.status === 'fail').map((check) => check.key);
  const pendingChecks = (item.checks || []).filter((check) => check.status === 'pending').length;
  const hasFailed = failedChecks.length > 0;
  const allPassed = !hasFailed && pendingChecks === 0 && item.checks.length > 0;
  return {
    ...item,
    failedChecks,
    requiresManagerReview: hasFailed || item.requiresManagerReview,
    reworkLoopRequired: hasFailed || item.reworkLoopRequired,
    dispatchAllowed: allPassed || item.status === 'accepted' || item.dispatchAllowed,
  };
}

function updateQc(qcId: string, updater: (item: ReplacementQcItem) => ReplacementQcItem) {
  let updated: ReplacementQcItem | null = null;
  store.items = store.items.map((item) => {
    if (item.id !== qcId) return item;
    updated = recalc(updater(item));
    return updated;
  });
  return updated;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-replacement-qc',
    data: {
      items: store.items,
      actions: store.actions,
      summary: summary(),
      supportedActions: ['seed-from-replacements', 'start-qc', 'pass-checks', 'fail-quality', 'send-rework-loop', 'manager-accept', 'close', 'clear'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'seed-from-replacements');
    const now = nowIso();

    if (action === 'clear') {
      store = { items: [], actions: [] };
      return NextResponse.json({ ok: true, source: 'internal-production-replacement-qc', data: { items: store.items, actions: store.actions, summary: summary() } });
    }

    if (action === 'seed-from-replacements') {
      const replacements = Array.isArray(body.replacements) ? body.replacements : [];
      const completed = replacements.filter((item: any) => ['completed', 'in-production', 'scheduled'].includes(String(item?.status || '').toLowerCase()));
      const existingReplacementIds = new Set(store.items.map((item) => item.replacementId));
      const nextItems = completed
        .filter((item: any) => !existingReplacementIds.has(String(item?.id || '')))
        .map(qcFromReplacement)
        .slice(0, 100);
      store.items = [...nextItems, ...store.items].slice(0, 150);
      nextItems.forEach((item) => addAction('seed-from-replacements', item, 'Replacement QC seeded from replacement job list.'));
      return NextResponse.json({ ok: true, source: 'internal-production-replacement-qc', data: { items: store.items, actions: store.actions, summary: summary() } });
    }

    const qcId = String(body.qcId || '');
    if (!qcId) return NextResponse.json({ ok: false, error: 'qcId is required' }, { status: 400 });

    const note = String(body.note || '').trim();
    const updated = updateQc(qcId, (item) => {
      const notes = note ? [note, ...(item.notes || [])].slice(0, 20) : item.notes || [];
      if (action === 'start-qc') return { ...item, status: 'in-qc', updatedAt: now, notes };
      if (action === 'pass-checks') {
        return {
          ...item,
          status: 'passed',
          checks: (item.checks || defaultChecks()).map((check) => ({ ...check, status: 'pass' as const })),
          requiresManagerReview: false,
          reworkLoopRequired: false,
          dispatchAllowed: true,
          updatedAt: now,
          notes,
        };
      }
      if (action === 'fail-quality') {
        const failedKey = String(body.failedKey || 'colour');
        return {
          ...item,
          status: 'failed',
          checks: (item.checks || defaultChecks()).map((check) => check.key === failedKey ? { ...check, status: 'fail' as const, note: note || 'QC failed.' } : check),
          requiresManagerReview: true,
          reworkLoopRequired: true,
          dispatchAllowed: false,
          updatedAt: now,
          notes,
        };
      }
      if (action === 'send-rework-loop') return { ...item, status: 'rework-loop', requiresManagerReview: true, reworkLoopRequired: true, dispatchAllowed: false, updatedAt: now, notes };
      if (action === 'manager-accept') return { ...item, status: 'accepted', requiresManagerReview: false, reworkLoopRequired: false, dispatchAllowed: true, updatedAt: now, notes };
      if (action === 'close') return { ...item, status: 'closed', updatedAt: now, notes };
      return { ...item, updatedAt: now, notes };
    });

    if (!updated) return NextResponse.json({ ok: false, error: 'Replacement QC item not found' }, { status: 404 });
    addAction(action, updated, note);

    return NextResponse.json({ ok: true, source: 'internal-production-replacement-qc', data: { items: store.items, actions: store.actions, summary: summary() }, item: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Replacement QC update failed' }, { status: 500 });
  }
}
