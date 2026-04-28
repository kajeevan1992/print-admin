export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const TASK_KEY = 'storefront-customer-service-tasks';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

const TEAM = [
  { id: 'support-lead', name: 'Support Lead', role: 'Customer Service', capacity: 12 },
  { id: 'artwork-desk', name: 'Artwork Desk', role: 'Prepress Support', capacity: 10 },
  { id: 'production-coordinator', name: 'Production Coordinator', role: 'Production Ops', capacity: 14 },
  { id: 'dispatch-desk', name: 'Dispatch Desk', role: 'Dispatch Support', capacity: 10 },
];

type CustomerTask = Record<string, any> & { id: string; status?: string; priority?: string; dueAt?: string; assigneeId?: string | null; assigneeName?: string | null };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer team workload update failed.' }, { status });
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

function minutesUntil(value?: string) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.round((time - Date.now()) / 60000);
}

function buildBoard(tasks: CustomerTask[]) {
  const active = tasks.filter((task) => String(task.status || '') !== 'completed');
  const items = TEAM.map((member) => {
    const assigned = active.filter((task) => String(task.assigneeId || '') === member.id);
    const dueSorted = [...assigned].filter((task) => task.dueAt).sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));
    const atRiskTasks = assigned.filter((task) => { const remaining = minutesUntil(task.dueAt); return remaining !== null && remaining >= 0 && remaining <= 120; }).length;
    const breachedTasks = assigned.filter((task) => { const remaining = minutesUntil(task.dueAt); return remaining !== null && remaining < 0; }).length;
    const urgentTasks = assigned.filter((task) => ['urgent', 'high'].includes(String(task.priority || '').toLowerCase())).length;
    const loadRatio = member.capacity > 0 ? assigned.length / member.capacity : 0;
    return {
      ...member,
      activeTasks: assigned.length,
      openTasks: assigned.filter((task) => !['completed', 'blocked'].includes(String(task.status || ''))).length,
      urgentTasks,
      atRiskTasks,
      breachedTasks,
      nextDueAt: dueSorted[0]?.dueAt || null,
      loadRatio,
      loadState: breachedTasks > 0 ? 'breached' : atRiskTasks > 0 ? 'at-risk' : loadRatio >= 1 ? 'full' : loadRatio >= 0.75 ? 'busy' : 'normal',
    };
  });
  return {
    items,
    summary: {
      teamMembers: TEAM.length,
      totalCapacity: TEAM.reduce((sum, member) => sum + member.capacity, 0),
      activeAssigned: items.reduce((sum, item) => sum + item.activeTasks, 0),
      unassignedActive: active.filter((task) => !task.assigneeId).length,
      atRiskOrBreached: items.reduce((sum, item) => sum + item.atRiskTasks + item.breachedTasks, 0),
      busiestAssignee: [...items].sort((a, b) => b.activeTasks - a.activeTasks)[0]?.name || null,
    },
  };
}

async function logCommunication(request: NextRequest, subject: string, message: string) {
  const communications = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = {
    id: `communication-team-workload-${Date.now()}`,
    channel: 'internal-note',
    direction: 'internal',
    status: 'logged',
    subject,
    message,
    createdAt: now,
    updatedAt: now,
    source: 'customer-team-workload',
    history: [{ at: now, action: 'team-workload-update', source: 'customer-team-workload' }],
  };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...communications], 'StorefrontCustomerCommunications');
}

export async function GET(request: NextRequest) {
  try {
    const tasks = await readConfigItems<CustomerTask>(request, TASK_KEY);
    return NextResponse.json({ ok: true, source: 'internal-customer-team-workload-db', data: buildBoard(tasks) });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const assigneeId = String(body.assigneeId || '').trim();
    const action = String(body.action || '').trim();
    if (!assigneeId) return responseError(new Error('assigneeId is required.'), 400);
    const member = TEAM.find((item) => item.id === assigneeId);
    if (!member) return responseError(new Error('Team member was not found.'), 404);

    const tasks = await readConfigItems<CustomerTask>(request, TASK_KEY);
    const now = new Date().toISOString();

    if (action === 'balance-next') {
      const unassigned = tasks.find((task) => !task.assigneeId && String(task.status || '') !== 'completed');
      if (unassigned) {
        unassigned.assigneeId = member.id;
        unassigned.assigneeName = member.name;
        unassigned.assignedAt = unassigned.assignedAt || now;
        unassigned.assignmentUpdatedAt = now;
        unassigned.history = [...(Array.isArray(unassigned.history) ? unassigned.history : []), { at: now, action: 'balance-next', assigneeId: member.id, source: 'customer-team-workload' }];
        await saveConfigItems(request, TASK_KEY, 'Customer service tasks', 'Internal task list for customer/order follow-ups. No external notifications are sent here.', tasks, 'StorefrontCustomerTasks');
        await logCommunication(request, 'Team workload balanced', `Assigned ${unassigned.title || unassigned.id} to ${member.name}.`);
      } else {
        await logCommunication(request, 'Team workload reviewed', `No unassigned active tasks were available for ${member.name}.`);
      }
    } else if (action === 'mark-review') {
      await logCommunication(request, 'Team workload review', `${member.name} workload was reviewed from the storefront-test operations view.`);
    } else {
      return responseError(new Error('Unsupported workload action.'), 400);
    }

    const board = buildBoard(tasks);
    return NextResponse.json({ ok: true, source: 'internal-customer-team-workload-db', data: board, item: board.items.find((item) => item.id === member.id) || member });
  } catch (error) {
    return responseError(error);
  }
}
