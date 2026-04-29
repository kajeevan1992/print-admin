import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type WorkflowStage = 'draft' | 'confirmed' | 'preflight' | 'production' | 'dispatch' | 'completed' | 'blocked';

type WorkflowItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  stage: WorkflowStage;
  status: string;
  preflightStatus: 'pending' | 'pass' | 'fail' | 'override';
  productionBlocked: boolean;
  nextAction: string;
  updatedAt: string;
  history: Array<{ at: string; action: string; from?: string; to?: string; note?: string }>;
};

const nowIso = () => new Date().toISOString();

let workflowStore: { items: WorkflowItem[]; actions: any[] } = {
  items: [
    {
      id: 'workflow-demo-001',
      orderId: 'order-demo-001',
      orderNumber: 'ORD-DEMO-001',
      customerName: 'Demo Customer',
      stage: 'draft',
      status: 'draft-order-created',
      preflightStatus: 'pending',
      productionBlocked: true,
      nextAction: 'confirm-order',
      updatedAt: nowIso(),
      history: [{ at: nowIso(), action: 'created', to: 'draft', note: 'Demo order workflow created.' }],
    },
  ],
  actions: [],
};

function summary(items: WorkflowItem[]) {
  return {
    total: items.length,
    draft: items.filter((item) => item.stage === 'draft').length,
    confirmed: items.filter((item) => item.stage === 'confirmed').length,
    preflight: items.filter((item) => item.stage === 'preflight').length,
    production: items.filter((item) => item.stage === 'production').length,
    dispatch: items.filter((item) => item.stage === 'dispatch').length,
    completed: items.filter((item) => item.stage === 'completed').length,
    blocked: items.filter((item) => item.productionBlocked || item.stage === 'blocked').length,
  };
}

function nextActionFor(stage: WorkflowStage, preflightStatus: WorkflowItem['preflightStatus']) {
  if (stage === 'draft') return 'confirm-order';
  if (stage === 'confirmed') return 'send-to-preflight';
  if (stage === 'preflight' && preflightStatus === 'pass') return 'release-to-production';
  if (stage === 'preflight') return 'resolve-preflight';
  if (stage === 'production') return 'release-to-dispatch';
  if (stage === 'dispatch') return 'mark-completed';
  if (stage === 'blocked') return 'manager-review';
  return 'none';
}

function transition(item: WorkflowItem, action: string, note?: string): WorkflowItem {
  const from = item.stage;
  let to: WorkflowStage = item.stage;
  let preflightStatus = item.preflightStatus;
  let productionBlocked = item.productionBlocked;
  let status = item.status;

  if (action === 'confirm-order') {
    to = 'confirmed';
    status = 'order-confirmed';
    productionBlocked = true;
  }

  if (action === 'send-to-preflight') {
    to = 'preflight';
    status = 'awaiting-preflight';
    preflightStatus = 'pending';
    productionBlocked = true;
  }

  if (action === 'mark-preflight-pass') {
    to = 'preflight';
    status = 'preflight-passed';
    preflightStatus = 'pass';
    productionBlocked = false;
  }

  if (action === 'mark-preflight-fail') {
    to = 'blocked';
    status = 'preflight-failed';
    preflightStatus = 'fail';
    productionBlocked = true;
  }

  if (action === 'override-preflight') {
    to = 'preflight';
    status = 'preflight-override-approved';
    preflightStatus = 'override';
    productionBlocked = false;
  }

  if (action === 'release-to-production') {
    if (item.productionBlocked && item.preflightStatus !== 'pass' && item.preflightStatus !== 'override') {
      return { ...item, status: 'blocked-preflight-required', updatedAt: nowIso() };
    }
    to = 'production';
    status = 'in-production';
    productionBlocked = false;
  }

  if (action === 'release-to-dispatch') {
    to = 'dispatch';
    status = 'ready-for-dispatch';
  }

  if (action === 'mark-completed') {
    to = 'completed';
    status = 'completed';
  }

  const updatedAt = nowIso();
  return {
    ...item,
    stage: to,
    status,
    preflightStatus,
    productionBlocked,
    nextAction: nextActionFor(to, preflightStatus),
    updatedAt,
    history: [{ at: updatedAt, action, from, to, note }, ...(item.history || [])].slice(0, 30),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-order-workflow',
    data: {
      items: workflowStore.items,
      actions: workflowStore.actions,
      summary: summary(workflowStore.items),
      stages: ['draft', 'confirmed', 'preflight', 'production', 'dispatch', 'completed', 'blocked'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'confirm-order');
    const workflowId = String(body.workflowId || body.id || workflowStore.items[0]?.id || '');
    const note = String(body.note || '').trim() || undefined;

    if (action === 'create-demo') {
      const createdAt = nowIso();
      const item: WorkflowItem = {
        id: `workflow-${Date.now()}`,
        orderId: String(body.orderId || `order-${Date.now()}`),
        orderNumber: String(body.orderNumber || `ORD-${Date.now()}`),
        customerName: String(body.customerName || 'Storefront Customer'),
        stage: 'draft',
        status: 'draft-order-created',
        preflightStatus: 'pending',
        productionBlocked: true,
        nextAction: 'confirm-order',
        updatedAt: createdAt,
        history: [{ at: createdAt, action: 'created', to: 'draft', note: 'Workflow created from order pipeline.' }],
      };
      workflowStore.items = [item, ...workflowStore.items].slice(0, 50);
      workflowStore.actions = [{ id: `workflow-action-${Date.now()}`, action, workflowId: item.id, at: createdAt }, ...workflowStore.actions].slice(0, 100);
      return NextResponse.json({ ok: true, source: 'internal-order-workflow', item, data: { items: workflowStore.items, actions: workflowStore.actions, summary: summary(workflowStore.items) } });
    }

    const index = workflowStore.items.findIndex((item) => item.id === workflowId || item.orderId === workflowId);
    if (index < 0) {
      return NextResponse.json({ ok: false, error: 'Workflow item not found' }, { status: 404 });
    }

    const updated = transition(workflowStore.items[index], action, note);
    workflowStore.items[index] = updated;
    workflowStore.actions = [{ id: `workflow-action-${Date.now()}`, action, workflowId: updated.id, at: updated.updatedAt, note }, ...workflowStore.actions].slice(0, 100);

    return NextResponse.json({
      ok: true,
      source: 'internal-order-workflow',
      item: updated,
      data: {
        items: workflowStore.items,
        actions: workflowStore.actions,
        summary: summary(workflowStore.items),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Order workflow update failed' }, { status: 500 });
  }
}
