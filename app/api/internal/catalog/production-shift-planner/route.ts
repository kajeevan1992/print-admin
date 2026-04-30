import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ShiftStatus = 'unassigned' | 'assigned' | 'scheduled' | 'running' | 'blocked' | 'complete';
type ShiftJob = {
  id: string;
  orderNumber: string;
  productName: string;
  machineKey: string;
  shiftId?: string;
  operatorId?: string;
  status: ShiftStatus;
  priority: 'normal' | 'rush' | 'urgent';
  estimatedMinutes: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  productionBlocked?: boolean;
  blockReason?: string;
  history: Array<{ at: string; action: string; note?: string }>;
  updatedAt: string;
};

type Shift = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  capacityMinutes: number;
  machineKeys: string[];
  operatorIds: string[];
};

type Operator = { id: string; name: string; skills: string[]; maxMinutes: number };

const nowIso = () => new Date().toISOString();
const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60 * 1000);

function todayAt(hour: number, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const operators: Operator[] = [
  { id: 'operator-prepress-1', name: 'Prepress Operator', skills: ['prepress', 'sheet', 'finishing'], maxMinutes: 420 },
  { id: 'operator-digital-1', name: 'Digital Press Operator', skills: ['sheet', 'konica_c4070'], maxMinutes: 450 },
  { id: 'operator-large-format-1', name: 'Large Format Operator', skills: ['roll', 'hp_latex_1200'], maxMinutes: 450 },
];

const shifts: Shift[] = [
  { id: 'shift-today-am', name: 'Today AM Shift', startsAt: todayAt(9), endsAt: todayAt(13), capacityMinutes: 240, machineKeys: ['konica_c4070', 'hp_latex_1200', 'finishing_bench'], operatorIds: ['operator-prepress-1', 'operator-digital-1', 'operator-large-format-1'] },
  { id: 'shift-today-pm', name: 'Today PM Shift', startsAt: todayAt(13), endsAt: todayAt(17), capacityMinutes: 240, machineKeys: ['konica_c4070', 'hp_latex_1200', 'finishing_bench'], operatorIds: ['operator-prepress-1', 'operator-digital-1', 'operator-large-format-1'] },
  { id: 'shift-tomorrow-am', name: 'Tomorrow AM Shift', startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(), capacityMinutes: 240, machineKeys: ['konica_c4070', 'hp_latex_1200', 'finishing_bench'], operatorIds: ['operator-prepress-1', 'operator-digital-1', 'operator-large-format-1'] },
];

let shiftStore: { jobs: ShiftJob[]; actions: any[] } = {
  jobs: [
    { id: 'shift-job-001', orderNumber: 'ORD-DEMO-001', productName: 'Demo Business Cards', machineKey: 'konica_c4070', status: 'unassigned', priority: 'normal', estimatedMinutes: 45, history: [{ at: nowIso(), action: 'seeded' }], updatedAt: nowIso() },
    { id: 'shift-job-002', orderNumber: 'ORD-DEMO-002', productName: 'Demo PVC Banner', machineKey: 'hp_latex_1200', status: 'unassigned', priority: 'rush', estimatedMinutes: 75, history: [{ at: nowIso(), action: 'seeded' }], updatedAt: nowIso() },
  ],
  actions: [],
};

function canOperatorRun(operator: Operator, job: ShiftJob) {
  return operator.skills.includes(job.machineKey) || operator.skills.includes(job.machineKey.includes('latex') ? 'roll' : 'sheet') || operator.skills.includes('finishing');
}

function summarize(jobs: ShiftJob[]) {
  const assigned = jobs.filter((job) => job.shiftId || job.operatorId).length;
  const scheduledMinutes = jobs.reduce((sum, job) => sum + (job.status === 'assigned' || job.status === 'scheduled' || job.status === 'running' ? Number(job.estimatedMinutes || 0) : 0), 0);
  return {
    total: jobs.length,
    unassigned: jobs.filter((job) => job.status === 'unassigned').length,
    assigned,
    scheduled: jobs.filter((job) => job.status === 'scheduled').length,
    running: jobs.filter((job) => job.status === 'running').length,
    blocked: jobs.filter((job) => job.status === 'blocked' || job.productionBlocked).length,
    complete: jobs.filter((job) => job.status === 'complete').length,
    scheduledMinutes,
    operators: operators.length,
    shifts: shifts.length,
  };
}

function buildShiftBoard(jobs: ShiftJob[]) {
  return shifts.map((shift) => {
    const shiftJobs = jobs.filter((job) => job.shiftId === shift.id);
    const usedMinutes = shiftJobs.reduce((sum, job) => sum + Number(job.estimatedMinutes || 0), 0);
    return { ...shift, usedMinutes, freeMinutes: Math.max(0, shift.capacityMinutes - usedMinutes), jobs: shiftJobs };
  });
}

function autoAssign(jobs: ShiftJob[]) {
  const priorityRank: Record<string, number> = { urgent: 0, rush: 1, normal: 2 };
  const sorted = [...jobs].sort((a, b) => (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2));
  const shiftUsed = new Map<string, number>();
  const operatorUsed = new Map<string, number>();

  return sorted.map((job) => {
    if (job.productionBlocked || job.status === 'blocked' || job.status === 'complete') return job;
    const shift = shifts.find((item) => item.machineKeys.includes(job.machineKey) && (shiftUsed.get(item.id) || 0) + job.estimatedMinutes <= item.capacityMinutes) || shifts[0];
    const operator = operators.find((item) => shift.operatorIds.includes(item.id) && canOperatorRun(item, job) && (operatorUsed.get(item.id) || 0) + job.estimatedMinutes <= item.maxMinutes) || operators[0];
    const shiftStart = new Date(shift.startsAt);
    const used = shiftUsed.get(shift.id) || 0;
    const scheduledStart = addMinutes(shiftStart, used);
    const scheduledEnd = addMinutes(scheduledStart, Math.max(15, Number(job.estimatedMinutes || 30)));
    shiftUsed.set(shift.id, used + Number(job.estimatedMinutes || 0));
    operatorUsed.set(operator.id, (operatorUsed.get(operator.id) || 0) + Number(job.estimatedMinutes || 0));

    return {
      ...job,
      shiftId: shift.id,
      operatorId: operator.id,
      status: 'scheduled' as ShiftStatus,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      updatedAt: nowIso(),
      history: [{ at: nowIso(), action: 'auto-assign-shift', note: `${shift.name} / ${operator.name}` }, ...(job.history || [])].slice(0, 25),
    };
  });
}

function updateJob(job: ShiftJob, action: string, note?: string): ShiftJob {
  let status = job.status;
  let priority = job.priority;
  let productionBlocked = job.productionBlocked;
  let blockReason = job.blockReason;

  if (action === 'start') status = productionBlocked ? 'blocked' : 'running';
  if (action === 'complete') status = 'complete';
  if (action === 'assign') status = 'assigned';
  if (action === 'rush') priority = 'rush';
  if (action === 'urgent') priority = 'urgent';
  if (action === 'block') { status = 'blocked'; productionBlocked = true; blockReason = note || 'Blocked from shift planner.'; }
  if (action === 'clear-block') { productionBlocked = false; blockReason = undefined; status = job.shiftId ? 'scheduled' : 'unassigned'; }

  return { ...job, status, priority, productionBlocked, blockReason, updatedAt: nowIso(), history: [{ at: nowIso(), action, note }, ...(job.history || [])].slice(0, 25) };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-shift-planner',
    data: {
      shifts,
      operators,
      jobs: shiftStore.jobs,
      board: buildShiftBoard(shiftStore.jobs),
      actions: shiftStore.actions,
      summary: summarize(shiftStore.jobs),
      plannerActions: ['seed-from-machine-planner', 'auto-assign-shifts', 'start', 'complete', 'rush', 'urgent', 'block', 'clear-block'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'auto-assign-shifts');
    const now = nowIso();

    if (action === 'seed-from-machine-planner') {
      const incoming = Array.isArray(body.jobs) ? body.jobs : [];
      const mapped = incoming.slice(0, 60).map((job: any, index: number): ShiftJob => {
        const blocked = Boolean(job.productionBlocked || job.status === 'blocked');
        return {
          id: `shift-${String(job.id || Date.now() + index)}`,
          orderNumber: String(job.orderNumber || job.orderId || 'ORD-SHIFT'),
          productName: String(job.productName || 'Production Job'),
          machineKey: String(job.machineKey || job.lane || 'konica_c4070'),
          status: blocked ? 'blocked' : 'unassigned',
          priority: String(job.priority || 'normal') as ShiftJob['priority'],
          estimatedMinutes: Number(job.estimatedMinutes || 45),
          productionBlocked: blocked,
          blockReason: job.blockReason ? String(job.blockReason) : undefined,
          history: [{ at: now, action: 'seed-from-machine-planner', note: 'Imported from machine lane planner.' }],
          updatedAt: now,
        };
      });
      shiftStore.jobs = [...mapped, ...shiftStore.jobs].slice(0, 160);
    } else if (action === 'auto-assign-shifts') {
      shiftStore.jobs = autoAssign(shiftStore.jobs);
    } else {
      const jobId = String(body.jobId || body.id || '');
      const index = shiftStore.jobs.findIndex((job) => job.id === jobId);
      if (index < 0) return NextResponse.json({ ok: false, error: 'Shift planner job not found' }, { status: 404 });
      shiftStore.jobs[index] = updateJob(shiftStore.jobs[index], action, body.note ? String(body.note) : undefined);
    }

    shiftStore.actions = [{ id: `shift-action-${Date.now()}`, action, jobId: body.jobId || body.id || null, at: now }, ...shiftStore.actions].slice(0, 100);
    return NextResponse.json({
      ok: true,
      source: 'internal-production-shift-planner',
      data: { shifts, operators, jobs: shiftStore.jobs, board: buildShiftBoard(shiftStore.jobs), actions: shiftStore.actions, summary: summarize(shiftStore.jobs) },
      item: shiftStore.jobs.find((job) => job.id === String(body.jobId || body.id || '')) || null,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Shift planner update failed' }, { status: 500 });
  }
}
