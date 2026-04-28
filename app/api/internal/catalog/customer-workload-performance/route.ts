export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const TASK_KEY = 'storefront-customer-service-tasks';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';
const PERFORMANCE_KEY = 'storefront-customer-workload-performance-audit';

const TEAM = [
  { id: 'support-lead', name: 'Support Lead', role: 'Customer Service', capacity: 12 },
  { id: 'artwork-desk', name: 'Artwork Desk', role: 'Prepress Support', capacity: 10 },
  { id: 'production-coordinator', name: 'Production Coordinator', role: 'Production Ops', capacity: 14 },
  { id: 'dispatch-desk', name: 'Dispatch Desk', role: 'Dispatch Support', capacity: 10 },
];

type CustomerTask = Record<string, any> & { id: string; status?: string; priority?: string; dueAt?: string; assigneeId?: string | null; assigneeName?: string | null; createdAt?: string; updatedAt?: string; completedAt?: string };
type PerformanceAudit = Record<string, any> & { id: string; action: string; assigneeId?: string; createdAt: string };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer workload performance update failed.' }, { status });
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

function minutesBetween(start?: string, end?: string) {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / 60000));
}

function buildPerformance(tasks: CustomerTask[], audits: PerformanceAudit[]) {
  const active = tasks.filter((task) => String(task.status || '') !== 'completed');
  const completed = tasks.filter((task) => String(task.status || '') === 'completed');
  const breached = active.filter((task) => { const remaining = minutesUntil(task.dueAt); return remaining !== null && remaining < 0; });
  const atRisk = active.filter((task) => { const remaining = minutesUntil(task.dueAt); return remaining !== null && remaining >= 0 && remaining <= 120; });
  const completionMinutes = completed.map((task) => minutesBetween(task.createdAt, task.completedAt || task.updatedAt)).filter((value): value is number => typeof value === 'number');
  const averageCompletionMinutes = completionMinutes.length ? Math.round(completionMinutes.reduce((sum, value) => sum + value, 0) / completionMinutes.length) : null;

  const items = TEAM.map((member) => {
    const memberTasks = tasks.filter((task) => String(task.assigneeId || '') === member.id);
    const memberActive = memberTasks.filter((task) => String(task.status || '') !== 'completed');
    const memberCompleted = memberTasks.filter((task) => String(task.status || '') === 'completed');
    const memberBreached = memberActive.filter((task) => { const remaining = minutesUntil(task.dueAt); return remaining !== null && remaining < 0; }).length;
    const memberAtRisk = memberActive.filter((task) => { const remaining = minutesUntil(task.dueAt); return remaining !== null && remaining >= 0 && remaining <= 120; }).length;
    const memberAudit = audits.filter((audit) => String(audit.assigneeId || '') === member.id);
    const score = Math.max(0, 100 - (memberBreached * 20) - (memberAtRisk * 8) - Math.max(0, memberActive.length - member.capacity) * 5);
    return { ...member, activeTasks: memberActive.length, completedTasks: memberCompleted.length, atRiskTasks: memberAtRisk, breachedTasks: memberBreached, auditEvents: memberAudit.length, performanceScore: score, trend: score >= 90 ? 'healthy' : score >= 70 ? 'watch' : 'needs-attention' };
  });

  return { items, audits: audits.slice(0, 20), summary: { activeTasks: active.length, completedTasks: completed.length, atRiskTasks: atRisk.length, breachedTasks: breached.length, averageCompletionMinutes, teamScore: items.length ? Math.round(items.reduce((sum, item) => sum + item.performanceScore, 0) / items.length) : 100, latestAuditAt: audits[0]?.createdAt || null } };
}

async function logCommunication(request: NextRequest, subject: string, message: string) {
  const communications = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = { id: `communication-workload-performance-${Date.now()}`, channel: 'internal-note', direction: 'internal', status: 'logged', subject, message, createdAt: now, updatedAt: now, source: 'customer-workload-performance', history: [{ at: now, action: 'workload-performance-audit', source: 'customer-workload-performance' }] };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...communications], 'StorefrontCustomerCommunications');
}

export async function GET(request: NextRequest) {
  try {
    const tasks = await readConfigItems<CustomerTask>(request, TASK_KEY);
    const audits = await readConfigItems<PerformanceAudit>(request, PERFORMANCE_KEY);
    return NextResponse.json({ ok: true, source: 'internal-customer-workload-performance-db', data: buildPerformance(tasks, audits) });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    const assigneeId = String(body.assigneeId || '').trim();
    const member = assigneeId ? TEAM.find((item) => item.id === assigneeId) : null;
    if (assigneeId && !member) return responseError(new Error('Team member was not found.'), 404);
    if (!['snapshot', 'coach', 'clear-audit'].includes(action)) return responseError(new Error('Unsupported performance action.'), 400);
    const audits = await readConfigItems<PerformanceAudit>(request, PERFORMANCE_KEY);
    const now = new Date().toISOString();
    let nextAudits = audits;
    if (action === 'clear-audit') {
      nextAudits = [];
      await logCommunication(request, 'Workload performance audit cleared', 'Customer workload performance audit records were cleared from the operations view.');
    } else {
      const audit = { id: `workload-performance-${Date.now()}`, action, assigneeId: member?.id || null, assigneeName: member?.name || null, note: action === 'coach' ? `Coaching/review note logged for ${member?.name || 'team'}.` : 'Team workload performance snapshot recorded.', createdAt: now, source: 'customer-workload-performance' };
      nextAudits = [audit, ...audits];
      await logCommunication(request, action === 'coach' ? 'Workload coaching note' : 'Workload performance snapshot', audit.note);
    }
    await saveConfigItems(request, PERFORMANCE_KEY, 'Customer workload performance audit', 'Operational audit snapshots for customer task workload and SLA performance.', nextAudits, 'StorefrontCustomerWorkloadPerformance');
    const tasks = await readConfigItems<CustomerTask>(request, TASK_KEY);
    const performance = buildPerformance(tasks, nextAudits);
    return NextResponse.json({ ok: true, source: 'internal-customer-workload-performance-db', data: performance, item: performance.audits[0] || null });
  } catch (error) { return responseError(error); }
}
