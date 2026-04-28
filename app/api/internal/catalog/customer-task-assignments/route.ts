export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const TASK_KEY = 'storefront-customer-service-tasks';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

const DEFAULT_ASSIGNEES = [
  { id: 'support-lead', name: 'Support Lead', role: 'Customer Service', capacity: 12 },
  { id: 'artwork-desk', name: 'Artwork Desk', role: 'Prepress Support', capacity: 10 },
  { id: 'production-coordinator', name: 'Production Coordinator', role: 'Production Ops', capacity: 14 },
  { id: 'dispatch-desk', name: 'Dispatch Desk', role: 'Dispatch Support', capacity: 10 },
];

type CustomerTask = Record<string, any> & {
  id: string;
  orderId: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer task assignment update failed.' }, { status });
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

function assigneeFor(id: string) {
  return DEFAULT_ASSIGNEES.find((assignee) => assignee.id === id) || DEFAULT_ASSIGNEES[0];
}

function enrichTasks(tasks: CustomerTask[]) {
  return tasks.map((task) => ({
    ...task,
    assignmentState: task.assigneeId ? 'assigned' : 'unassigned',
    assigneeName: task.assigneeName || (task.assigneeId ? assigneeFor(String(task.assigneeId)).name : null),
  }));
}

function summarise(tasks: CustomerTask[]) {
  const enriched = enrichTasks(tasks);
  const workload = DEFAULT_ASSIGNEES.map((assignee) => {
    const assigned = enriched.filter((task) => task.assigneeId === assignee.id && task.status !== 'completed').length;
    return { ...assignee, assigned, remainingCapacity: Math.max(0, assignee.capacity - assigned) };
  });
  return {
    totalTasks: enriched.length,
    assigned: enriched.filter((task) => task.assigneeId).length,
    unassigned: enriched.filter((task) => !task.assigneeId).length,
    activeAssigned: enriched.filter((task) => task.assigneeId && task.status !== 'completed').length,
    overloadedAssignees: workload.filter((assignee) => assignee.assigned > assignee.capacity).length,
    workload,
  };
}

async function logCommunication(request: NextRequest, task: CustomerTask, action: string) {
  const communications = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = {
    id: `communication-assignment-${Date.now()}`,
    orderId: task.orderId,
    orderNumber: task.orderNumber || null,
    customerName: task.customerName || null,
    channel: 'internal-note',
    direction: 'internal',
    status: 'logged',
    subject: `Task assignment ${action}`,
    message: `${action}: ${task.title || task.id}${task.assigneeName ? ` → ${task.assigneeName}` : ''}`,
    createdAt: now,
    updatedAt: now,
    source: 'customer-task-assignments',
    history: [{ at: now, action, assigneeId: task.assigneeId || null, source: 'customer-task-assignments' }],
  };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...communications], 'StorefrontCustomerCommunications');
}

export async function GET(request: NextRequest) {
  try {
    const tasks = await readConfigItems<CustomerTask>(request, TASK_KEY);
    const enriched = enrichTasks(tasks).sort((a, b) => Number(!a.assigneeId) - Number(!b.assigneeId) || String(a.dueAt || '').localeCompare(String(b.dueAt || '')));
    return NextResponse.json({ ok: true, source: 'internal-customer-task-assignments-db', data: { items: enriched, assignees: DEFAULT_ASSIGNEES, summary: summarise(tasks) } });
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
      history: [...(Array.isArray(current.history) ? current.history : []), { at: now, action, source: 'customer-task-assignments' }],
    };

    if (action === 'assign') {
      const assignee = assigneeFor(String(body.assigneeId || 'support-lead'));
      next.assigneeId = assignee.id;
      next.assigneeName = assignee.name;
      next.assignedAt = next.assignedAt || now;
      next.assignmentUpdatedAt = now;
    } else if (action === 'assign-next') {
      const summary = summarise(tasks);
      const assignee = [...summary.workload].sort((a, b) => a.assigned - b.assigned || b.remainingCapacity - a.remainingCapacity)[0] || DEFAULT_ASSIGNEES[0];
      next.assigneeId = assignee.id;
      next.assigneeName = assignee.name;
      next.assignedAt = next.assignedAt || now;
      next.assignmentUpdatedAt = now;
    } else if (action === 'unassign') {
      next.assigneeId = null;
      next.assigneeName = null;
      next.unassignedAt = now;
    } else {
      return responseError(new Error('Unsupported assignment action.'), 400);
    }

    const nextTasks = tasks.map((task, taskIndex) => taskIndex === index ? next : task);
    await saveConfigItems(request, TASK_KEY, 'Customer service tasks', 'Internal task list for customer/order follow-ups. No external notifications are sent here.', nextTasks, 'StorefrontCustomerTasks');
    await logCommunication(request, next, action);

    const enriched = enrichTasks(nextTasks);
    return NextResponse.json({ ok: true, source: 'internal-customer-task-assignments-db', data: { items: enriched, assignees: DEFAULT_ASSIGNEES, summary: summarise(nextTasks) }, item: enrichTasks([next])[0] });
  } catch (error) {
    return responseError(error);
  }
}
