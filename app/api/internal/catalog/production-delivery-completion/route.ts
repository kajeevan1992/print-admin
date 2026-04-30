import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type CompletionItem = Record<string, any>;

type CompletionStore = {
  items: CompletionItem[];
  actions: CompletionItem[];
};

const store: CompletionStore = {
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

function summarise(items: CompletionItem[]) {
  return {
    total: items.length,
    awaitingDispatch: items.filter((item) => item.status === 'awaiting-dispatch').length,
    inTransit: items.filter((item) => item.status === 'in-transit').length,
    readyForCollection: items.filter((item) => item.status === 'ready-for-collection').length,
    delivered: items.filter((item) => item.status === 'delivered').length,
    collected: items.filter((item) => item.status === 'collected').length,
    completed: items.filter((item) => item.orderStatus === 'completed').length,
    blocked: items.filter((item) => item.completionBlocked).length,
  };
}

function normaliseSeed(source: any, index: number): CompletionItem {
  const dispatched = bool(source.dispatchedAt) || source.status === 'dispatched' || source.releaseDecision === 'dispatched';
  const deliveryMode = String(source.deliveryMode || source.fulfilmentMode || (index % 2 === 0 ? 'delivery' : 'collection'));
  const blockedReasons: string[] = [];

  if (!dispatched) blockedReasons.push('not_dispatched');
  if (bool(source.dispatchBlocked)) blockedReasons.push('dispatch_blocked');
  if (bool(source.productionBlocked)) blockedReasons.push('production_blocked');

  const completionBlocked = blockedReasons.length > 0;

  return {
    id: makeId('delivery-completion'),
    orderId: source.orderId || source.workflowId || source.sourceOrderId || '',
    orderNumber: source.orderNumber || `SO-${String(index + 1).padStart(4, '0')}`,
    productName: source.productName || source.name || 'Completed print job',
    releaseId: source.releaseId || source.id || '',
    deliveryMode,
    courier: source.courier || (deliveryMode === 'delivery' ? 'Manual courier' : 'Customer collection'),
    trackingNumber: source.trackingNumber || '',
    customerName: source.customerName || source.customer?.name || 'Customer',
    status: completionBlocked ? 'awaiting-dispatch' : deliveryMode === 'collection' ? 'ready-for-collection' : 'in-transit',
    orderStatus: completionBlocked ? 'dispatch-pending' : 'fulfilment-in-progress',
    completionBlocked,
    blockedReasons,
    proofOfDelivery: null,
    collectionSignature: null,
    completedAt: null,
    notes: [completionBlocked ? 'Completion blocked until dispatch release is complete.' : 'Ready for delivery or collection confirmation.'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function updateItem(item: CompletionItem, action: string, payload: any) {
  const updated = { ...item, updatedAt: nowIso() };
  const notes = Array.isArray(updated.notes) ? [...updated.notes] : [];
  const note = String(payload.note || '').trim();
  if (note) notes.unshift(note);

  if (action === 'mark-in-transit') {
    if (updated.completionBlocked) {
      notes.unshift('Cannot move to transit while completion is blocked.');
    } else {
      updated.status = 'in-transit';
      updated.orderStatus = 'fulfilment-in-progress';
      updated.trackingNumber = payload.trackingNumber || updated.trackingNumber || `TRK-${Date.now()}`;
      updated.courier = payload.courier || updated.courier || 'Manual courier';
    }
  }

  if (action === 'ready-for-collection') {
    if (updated.completionBlocked) {
      notes.unshift('Cannot mark ready for collection while completion is blocked.');
    } else {
      updated.deliveryMode = 'collection';
      updated.status = 'ready-for-collection';
      updated.orderStatus = 'awaiting-collection';
    }
  }

  if (action === 'delivered') {
    if (updated.completionBlocked) {
      notes.unshift('Delivery confirmation denied because completion is blocked.');
    } else {
      updated.status = 'delivered';
      updated.orderStatus = 'completed';
      updated.completedAt = nowIso();
      updated.proofOfDelivery = {
        receivedBy: payload.receivedBy || updated.customerName || 'Customer',
        reference: payload.reference || `POD-${Date.now()}`,
        at: nowIso(),
      };
    }
  }

  if (action === 'collected') {
    if (updated.completionBlocked) {
      notes.unshift('Collection confirmation denied because completion is blocked.');
    } else {
      updated.status = 'collected';
      updated.orderStatus = 'completed';
      updated.completedAt = nowIso();
      updated.collectionSignature = {
        collectedBy: payload.collectedBy || updated.customerName || 'Customer',
        reference: payload.reference || `COL-${Date.now()}`,
        at: nowIso(),
      };
    }
  }

  if (action === 'block-completion') {
    updated.completionBlocked = true;
    updated.blockedReasons = Array.from(new Set([...(updated.blockedReasons || []), payload.reason || 'manual_completion_hold']));
    updated.orderStatus = 'completion-blocked';
    notes.unshift(`Completion blocked: ${payload.reason || 'manual_completion_hold'}`);
  }

  if (action === 'clear-completion-block') {
    updated.completionBlocked = false;
    updated.blockedReasons = [];
    updated.orderStatus = 'fulfilment-in-progress';
    if (updated.status === 'awaiting-dispatch') updated.status = updated.deliveryMode === 'collection' ? 'ready-for-collection' : 'in-transit';
    notes.unshift('Completion block cleared.');
  }

  updated.notes = notes.slice(0, 25);
  return updated;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-delivery-completion',
    data: {
      items: store.items,
      actions: store.actions,
      summary: summarise(store.items),
      rules: [
        'Orders can only complete after dispatch release has been marked dispatched.',
        'Delivery confirmation records proof-of-delivery metadata before order completion.',
        'Collection confirmation records collection signature/reference before order completion.',
        'Blocked production or dispatch items cannot be completed until the block is cleared.',
      ],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'seed-from-dispatch-release');

    if (action === 'seed-from-dispatch-release') {
      const sources = Array.isArray(body.items) ? body.items : [];
      const seedSource = sources.length > 0 ? sources : [
        {
          orderNumber: 'DEMO-COMPLETE-001',
          productName: 'Business cards',
          status: 'dispatched',
          releaseDecision: 'dispatched',
          deliveryMode: 'delivery',
          customerName: 'Demo Customer',
        },
      ];
      store.items = seedSource.map(normaliseSeed).slice(0, 100);
    } else {
      const completionId = String(body.completionId || body.id || '');
      const index = store.items.findIndex((item) => String(item.id) === completionId);
      if (index < 0) {
        return NextResponse.json({ ok: false, error: 'Delivery completion item not found' }, { status: 404 });
      }
      store.items[index] = updateItem(store.items[index], action, body);
    }

    const event = { id: makeId('delivery-completion-action'), action, at: nowIso(), note: body.note || '' };
    store.actions = [event, ...store.actions].slice(0, 100);

    return NextResponse.json({
      ok: true,
      source: 'internal-production-delivery-completion',
      data: {
        items: store.items,
        actions: store.actions,
        summary: summarise(store.items),
      },
      item: store.items[0] || null,
      action: event,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Delivery completion update failed' }, { status: 500 });
  }
}
