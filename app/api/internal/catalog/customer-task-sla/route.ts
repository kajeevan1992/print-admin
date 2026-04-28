export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const TASK_KEY = 'storefront-customer-service-tasks';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type CustomerTask = Record<string, any> & {
  id: string;
  orderId: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer task SLA update failed.' }, { status });
}

async function readConfigItems<T>(request: NextRequest, key: string): Promise<T[]> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

async function saveConfigItems(request: NextRequest, key: string, name: string, description: string, items: unknown[], source: string) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: key,
    slug: key,
    name,
    description,
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: key, source },
  } as any);
}

function addHours(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function slaState(task: CustomerTask) {
  if (task.status === 'completed') return 'completed';
  const due = task.dueAt ? new Date(task.dueAt).getTime() : 0;
  if (!due) return 'no-due-date';
  const remainingMs = due - Date.now();
  if (remainingMs < 0) return 'breached';
  if (remainingMs <= 2 * 60 * 60 * 1000) return 'at-risk';
  return 'on-track';
}

function enrichTask(task: CustomerTask) {
  const due = task.dueAt ? new Date(task.dueAt).getTime() : 0;
  const remainingMinutes = due ? Math.round((due - Date.now()) / 60000) : null;
  const state = slaState(task);
  return {
    ...task,
    slaState: state,
    remainingMinutes,
    escalationRequired: state === 'breached' || (state === 'at-risk' && task.priority === 'urgent'),
  };
}

function summarise(tasks: CustomerTask[]) {
  const enriched = tasks.map(enrichTask);
  return {
    totalTasks: enriched.length,
    onTrack: enriched.filter((task) => task.slaState === 'on-track').length,
    atRisk: enriched.filter((task) => task.slaState === 'at-risk').length,
    breached: enriched.filter((task) => task.slaState === 'breached').length,
    escalated: enriched.filter((task) => task.escalatedAt || task.priority === 'escalated').length,
    escalationRequired: enriched.filter((task) => task.escalationRequired).length,
  };
}

async function logCommunication(request: NextRequest, task: CustomerTask, action: string) {
  const communications = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = {
    id: `communication-sla-${Date.now()}`,
    orderId: task.orderId,
    orderNumber: task.orderNumber || null,
    customerName: task.customerName || null,
    channel: 'internal-note',
    direction: 'internal',
    status: 'logged',
    subject: `Task SLA ${action}`,
    message: `${action}: ${task.title || task.id}`,
    createdAt: now,
    updatedAt: now,
    source: 'customer-task-sla',
    history: [{ at: now, action, status: task.status, source: 'customer-task-sla' }],
  };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...communications], 'StorefrontCustomerCommunications');
}

export async function GET(request: NextRequest) {
  try {
    const tasks = await readConfigItems<CustomerTask>(request, TASK_KEY);
    const enriched = tasks.map(enrichTask).sort((a, b) => {
      const rank: Record<string, number> = { breached: 0, 'at-risk': 1, 'on-track': 2, 'no-due-date': 3, completed: 4 };
      return (rank[String(a.slaState)] ?? 9) - (rank[String(b.slaState)] ?? 9) || String(a.dueAt || '').localeCompare(String(b.dueAt || ''));
    });
    return NextResponse.json({ ok: true, source: 'internal-customer-task-sla-db', data: { items: enriched, summary: summarise(tasks) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    const taskId = String(body.taskId || '').trim();
    if (!taskId) return responseError(new Error('taskId is required.'), 400);

    const tasks = await readConfigItems<CustomerTask>(request, TASK_KEY);
    const now = new Date().toISOString();
    const index = tasks.findIndex((task) => String(task.id) === taskId);
    if (index < 0) return responseError(new Error('Customer task was not found.'), 404);

    const current = tasks[index];
    const next: CustomerTask = {
      ...current,
      updatedAt: now,
      history: [...(Array.isArray(current.history) ? current.history : []), { at: now, action, source: 'customer-task-sla' }],
    };

    if (action === 'escalate') {
      next.priority = 'escalated';
      next.escalatedAt = now;
      next.escalationNote = body.note || 'SLA escalation raised from storefront-test operations view.';
    } else if (action === 'snooze-2h') {
      next.dueAt = addHours(2);
      next.snoozedAt = now;
    } else if (action === 'snooze-24h') {
      next.dueAt = addHours(24);
      next.snoozedAt = now;
    } else if (action === 'clear-escalation') {
      next.priority = current.priority === 'escalated' ? 'normal' : current.priority;
      next.escalationClearedAt = now;
      next.escalatedAt = null;
    } else {
      return responseError(new Error('Unsupported SLA action.'), 400);
    }

    const nextTasks = tasks.map((task, taskIndex) => taskIndex === index ? next : task);
    await saveConfigItems(request, TASK_KEY, 'Customer service tasks', 'Internal task list for customer/order follow-ups. No external notifications are sent here.', nextTasks, 'StorefrontCustomerTasks');
    await logCommunication(request, next, action);

    const enriched = nextTasks.map(enrichTask);
    return NextResponse.json({ ok: true, source: 'internal-customer-task-sla-db', data: { items: enriched, summary: summarise(nextTasks) }, item: enrichTask(next) });
  } catch (error) {
    return responseError(error);
  }
}
