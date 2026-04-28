export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const TASK_KEY = 'storefront-customer-service-tasks';
const PERFORMANCE_KEY = 'storefront-customer-workload-performance-audit';
const REPORT_KEY = 'storefront-customer-workload-reporting';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

const TEAM = [
  { id: 'support-lead', name: 'Support Lead', role: 'Customer Service', capacity: 12 },
  { id: 'artwork-desk', name: 'Artwork Desk', role: 'Prepress Support', capacity: 10 },
  { id: 'production-coordinator', name: 'Production Coordinator', role: 'Production Ops', capacity: 14 },
  { id: 'dispatch-desk', name: 'Dispatch Desk', role: 'Dispatch Support', capacity: 10 },
];

type CustomerTask = Record<string, any> & { id: string; status?: string; priority?: string; dueAt?: string; assigneeId?: string | null; assigneeName?: string | null; createdAt?: string; completedAt?: string; updatedAt?: string };
type WorkloadReport = Record<string, any> & { id: string; reportType: string; createdAt: string };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer workload report failed.' }, { status });
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

function buildReportData(tasks: CustomerTask[], reports: WorkloadReport[], audits: any[]) {
  const active = tasks.filter((task) => String(task.status || '') !== 'completed');
  const completed = tasks.filter((task) => String(task.status || '') === 'completed');
  const breached = active.filter((task) => { const remaining = minutesUntil(task.dueAt); return remaining !== null && remaining < 0; });
  const atRisk = active.filter((task) => { const remaining = minutesUntil(task.dueAt); return remaining !== null && remaining >= 0 && remaining <= 120; });
  const urgent = active.filter((task) => String(task.priority || '') === 'urgent');
  const completionMinutes = completed.map((task) => minutesBetween(task.createdAt, task.completedAt || task.updatedAt)).filter((value): value is number => typeof value === 'number');
  const averageCompletionMinutes = completionMinutes.length ? Math.round(completionMinutes.reduce((sum, value) => sum + value, 0) / completionMinutes.length) : null;

  const rows = TEAM.map((member) => {
    const memberTasks = tasks.filter((task) => String(task.assigneeId || '') === member.id);
    const memberActive = memberTasks.filter((task) => String(task.status || '') !== 'completed');
    const memberCompleted = memberTasks.filter((task) => String(task.status || '') === 'completed');
    const memberBreached = memberActive.filter((task) => { const remaining = minutesUntil(task.dueAt); return remaining !== null && remaining < 0; }).length;
    const memberAtRisk = memberActive.filter((task) => { const remaining = minutesUntil(task.dueAt); return remaining !== null && remaining >= 0 && remaining <= 120; }).length;
    const score = Math.max(0, 100 - (memberBreached * 20) - (memberAtRisk * 8) - Math.max(0, memberActive.length - member.capacity) * 5);
    return { assigneeId: member.id, name: member.name, role: member.role, capacity: member.capacity, activeTasks: memberActive.length, completedTasks: memberCompleted.length, urgentTasks: memberActive.filter((task) => String(task.priority || '') === 'urgent').length, atRiskTasks: memberAtRisk, breachedTasks: memberBreached, performanceScore: score };
  });

  const csvPreview = ['Name,Role,Capacity,Active,Completed,Urgent,AtRisk,Breached,Score', ...rows.map((row) => [row.name, row.role, row.capacity, row.activeTasks, row.completedTasks, row.urgentTasks, row.atRiskTasks, row.breachedTasks, row.performanceScore].join(','))].join('\n');
  const summary = { activeTasks: active.length, completedTasks: completed.length, urgentTasks: urgent.length, atRiskTasks: atRisk.length, breachedTasks: breached.length, averageCompletionMinutes, teamScore: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.performanceScore, 0) / rows.length) : 100, reportsSaved: reports.length, auditEvents: audits.length, latestReportAt: reports[0]?.createdAt || null };
  return { rows, reports: reports.slice(0, 12), csvPreview, summary };
}

async function logCommunication(request: NextRequest, subject: string, message: string) {
  const communications = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = { id: `communication-workload-report-${Date.now()}`, channel: 'internal-note', direction: 'internal', status: 'logged', subject, message, createdAt: now, updatedAt: now, source: 'customer-workload-reports', history: [{ at: now, action: 'workload-report', source: 'customer-workload-reports' }] };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...communications], 'StorefrontCustomerCommunications');
}

export async function GET(request: NextRequest) {
  try {
    const [tasks, reports, audits] = await Promise.all([
      readConfigItems<CustomerTask>(request, TASK_KEY),
      readConfigItems<WorkloadReport>(request, REPORT_KEY),
      readConfigItems<any>(request, PERFORMANCE_KEY),
    ]);
    return NextResponse.json({ ok: true, source: 'internal-customer-workload-reports-db', data: buildReportData(tasks, reports, audits) });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!['generate-summary', 'export-csv', 'clear-reports'].includes(action)) return responseError(new Error('Unsupported workload report action.'), 400);
    const [tasks, currentReports, audits] = await Promise.all([
      readConfigItems<CustomerTask>(request, TASK_KEY),
      readConfigItems<WorkloadReport>(request, REPORT_KEY),
      readConfigItems<any>(request, PERFORMANCE_KEY),
    ]);
    const now = new Date().toISOString();
    let nextReports = currentReports;
    if (action === 'clear-reports') {
      nextReports = [];
      await logCommunication(request, 'Customer workload reports cleared', 'Saved workload report snapshots were cleared from the operations view.');
    } else {
      const data = buildReportData(tasks, currentReports, audits);
      const report: WorkloadReport = { id: `workload-report-${Date.now()}`, reportType: action === 'export-csv' ? 'csv-export-preview' : 'summary-snapshot', createdAt: now, summary: data.summary, rows: data.rows, csvPreview: data.csvPreview, source: 'customer-workload-reports' };
      nextReports = [report, ...currentReports].slice(0, 25);
      await logCommunication(request, action === 'export-csv' ? 'Customer workload export prepared' : 'Customer workload summary generated', `${report.reportType} recorded with ${data.summary.activeTasks} active tasks, ${data.summary.breachedTasks} breached tasks and team score ${data.summary.teamScore}.`);
    }
    await saveConfigItems(request, REPORT_KEY, 'Customer workload reporting', 'Saved report snapshots and export previews for customer service workload.', nextReports, 'StorefrontCustomerWorkloadReports');
    const data = buildReportData(tasks, nextReports, audits);
    return NextResponse.json({ ok: true, source: 'internal-customer-workload-reports-db', data, item: data.reports[0] || null });
  } catch (error) { return responseError(error); }
}
