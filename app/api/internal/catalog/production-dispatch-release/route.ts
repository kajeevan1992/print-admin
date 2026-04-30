import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ReleaseItem = Record<string, any>;

type ReleaseStore = {
  items: ReleaseItem[];
  actions: ReleaseItem[];
};

const store: ReleaseStore = {
  items: [],
  actions: [],
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function bool(value: any) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function summarise(items: ReleaseItem[]) {
  return {
    total: items.length,
    ready: items.filter((item) => item.status === 'ready-for-dispatch').length,
    held: items.filter((item) => item.status === 'held').length,
    released: items.filter((item) => item.status === 'released').length,
    blocked: items.filter((item) => item.dispatchBlocked).length,
    replacementReady: items.filter((item) => item.hasReplacement && item.replacementQcPassed).length,
    replacementBlocked: items.filter((item) => item.hasReplacement && !item.replacementQcPassed).length,
  };
}

function normaliseSeed(source: any, index: number): ReleaseItem {
  const replacementQcPassed = bool(source.dispatchAllowed) || source.status === 'closed' || source.status === 'manager-accepted';
  const hasReplacement = Boolean(source.replacementJobId || source.replacementId || source.originalJobId);
  const blockedReasons: string[] = [];

  if (bool(source.reworkLoopRequired)) blockedReasons.push('replacement_rework_loop_required');
  if (hasReplacement && !replacementQcPassed) blockedReasons.push('replacement_qc_not_passed');
  if (bool(source.productionBlocked)) blockedReasons.push('production_blocked');

  const blocked = blockedReasons.length > 0;

  return {
    id: makeId('dispatch-release'),
    orderId: source.orderId || source.workflowId || source.sourceOrderId || '',
    orderNumber: source.orderNumber || `SO-${String(index + 1).padStart(4, '0')}`,
    productName: source.productName || source.name || 'Production job',
    originalJobId: source.originalJobId || source.jobId || '',
    replacementJobId: source.replacementJobId || '',
    hasReplacement,
    replacementQcPassed,
    dispatchBlocked: blocked,
    blockedReasons,
    status: blocked ? 'held' : 'ready-for-dispatch',
    releaseDecision: blocked ? 'requires-review' : 'ready',
    notes: [hasReplacement ? 'Seeded from replacement QC closeout.' : 'Seeded from dispatch/production job.'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function updateItem(item: ReleaseItem, action: string, note?: string) {
  const updated = { ...item, updatedAt: nowIso() };
  const notes = Array.isArray(updated.notes) ? [...updated.notes] : [];
  if (note) notes.unshift(note);

  if (action === 'release') {
    if (updated.dispatchBlocked) {
      updated.status = 'held';
      updated.releaseDecision = 'blocked-release-denied';
      notes.unshift('Release denied because dispatch gate is blocked.');
    } else {
      updated.status = 'released';
      updated.releaseDecision = 'released';
      updated.releasedAt = nowIso();
    }
  }

  if (action === 'hold') {
    updated.status = 'held';
    updated.releaseDecision = 'manual-hold';
    updated.dispatchBlocked = true;
    updated.blockedReasons = Array.from(new Set([...(updated.blockedReasons || []), 'manual_hold']));
  }

  if (action === 'clear-hold') {
    updated.dispatchBlocked = false;
    updated.blockedReasons = [];
    updated.status = 'ready-for-dispatch';
    updated.releaseDecision = 'ready';
  }

  if (action === 'manager-override') {
    updated.dispatchBlocked = false;
    updated.blockedReasons = [];
    updated.status = 'released';
    updated.releaseDecision = 'manager-override-release';
    updated.overrideAt = nowIso();
  }

  if (action === 'mark-dispatched') {
    if (updated.status !== 'released') {
      updated.releaseDecision = 'dispatch-denied-not-released';
      notes.unshift('Dispatch denied because release gate has not been released.');
    } else {
      updated.status = 'dispatched';
      updated.dispatchedAt = nowIso();
      updated.releaseDecision = 'dispatched';
    }
  }

  updated.notes = notes.slice(0, 20);
  return updated;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-dispatch-release',
    data: {
      items: store.items,
      actions: store.actions,
      summary: summarise(store.items),
      rules: [
        'Original jobs and replacement/remake jobs are merged into one release decision.',
        'Replacement jobs must pass QC or receive manager override before dispatch release.',
        'Held/blocked items cannot be marked dispatched until released.',
      ],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'seed-from-replacement-qc');
    const note = String(body.note || '').trim();

    if (action === 'seed-from-replacement-qc') {
      const sources = Array.isArray(body.items) ? body.items : [];
      const seedSource = sources.length > 0 ? sources : [
        {
          orderNumber: 'DEMO-RELEASE-001',
          productName: 'Replacement business cards',
          originalJobId: 'job-original-demo',
          replacementJobId: 'job-remake-demo',
          dispatchAllowed: true,
          status: 'closed',
        },
      ];
      store.items = seedSource.map(normaliseSeed).slice(0, 100);
    } else {
      const releaseId = String(body.releaseId || body.id || '');
      const index = store.items.findIndex((item) => String(item.id) === releaseId);
      if (index < 0) {
        return NextResponse.json({ ok: false, error: 'Release item not found' }, { status: 404 });
      }
      store.items[index] = updateItem(store.items[index], action, note || `Dispatch release action: ${action}`);
    }

    const event = { id: makeId('dispatch-release-action'), action, at: nowIso(), note };
    store.actions = [event, ...store.actions].slice(0, 100);

    return NextResponse.json({
      ok: true,
      source: 'internal-production-dispatch-release',
      data: {
        items: store.items,
        actions: store.actions,
        summary: summarise(store.items),
      },
      item: store.items[0] || null,
      action: event,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Dispatch release update failed' }, { status: 500 });
  }
}
