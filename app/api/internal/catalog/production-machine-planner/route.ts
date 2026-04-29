import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type PlannerStatus = 'waiting' | 'scheduled' | 'running' | 'paused' | 'blocked' | 'complete';

type PlannerJob = {
  id: string;
  orderNumber: string;
  productName: string;
  jobType: string;
  machineKey: string;
  lane: string;
  status: PlannerStatus;
  priority: 'normal' | 'rush' | 'urgent';
  estimatedMinutes: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  productionBlocked: boolean;
  blockReason?: string;
  history: Array<{ at: string; action: string; note?: string }>;
  updatedAt: string;
};

type PlannerMachine = {
  key: string;
  name: string;
  type: 'sheet' | 'roll' | 'finishing' | 'hybrid';
  maxWidthMm?: number;
  maxSheetWidthMm?: number;
  maxSheetHeightMm?: number;
  supportsVariableLength?: boolean;
  shiftStartHour: number;
  shiftEndHour: number;
  capacityMinutesToday: number;
};

const nowIso = () => new Date().toISOString();
const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60 * 1000);

const machines: PlannerMachine[] = [
  { key: 'konica_c4070', name: 'Konica C4070 Digital Press', type: 'sheet', maxSheetWidthMm: 330, maxSheetHeightMm: 487, shiftStartHour: 9, shiftEndHour: 17, capacityMinutesToday: 480 },
  { key: 'hp_latex_1200', name: 'HP Latex 1.2m Roll Printer', type: 'roll', maxWidthMm: 1200, supportsVariableLength: true, shiftStartHour: 9, shiftEndHour: 17, capacityMinutesToday: 480 },
  { key: 'finishing_bench', name: 'Finishing Bench', type: 'finishing', shiftStartHour: 9, shiftEndHour: 17, capacityMinutesToday: 420 },
];

let plannerStore: { jobs: PlannerJob[]; actions: any[] } = {
  jobs: [
    {
      id: 'planner-job-001',
      orderNumber: 'ORD-DEMO-001',
      productName: 'Demo Business Cards',
      jobType: 'print',
      machineKey: 'konica_c4070',
      lane: 'konica_c4070',
      status: 'waiting',
      priority: 'normal',
      estimatedMinutes: 45,
      productionBlocked: false,
      history: [{ at: nowIso(), action: 'seeded', note: 'Waiting for machine schedule.' }],
      updatedAt: nowIso(),
    },
    {
      id: 'planner-job-002',
      orderNumber: 'ORD-DEMO-002',
      productName: 'Demo PVC Banner',
      jobType: 'print',
      machineKey: 'hp_latex_1200',
      lane: 'hp_latex_1200',
      status: 'waiting',
      priority: 'rush',
      estimatedMinutes: 75,
      productionBlocked: false,
      history: [{ at: nowIso(), action: 'seeded', note: 'Rush banner job waiting.' }],
      updatedAt: nowIso(),
    },
  ],
  actions: [],
};

function scheduleJobs(jobs: PlannerJob[]) {
  const scheduled: PlannerJob[] = [];
  const machineCursor = new Map<string, Date>();
  const base = new Date();
  base.setHours(9, 0, 0, 0);

  for (const job of jobs) {
    if (job.productionBlocked || job.status === 'blocked' || job.status === 'complete') {
      scheduled.push(job);
      continue;
    }

    const machine = machines.find((item) => item.key === job.machineKey) || machines[0];
    const cursor = machineCursor.get(machine.key) || base;
    const end = addMinutes(cursor, Math.max(15, Number(job.estimatedMinutes || 30)));
    machineCursor.set(machine.key, end);

    scheduled.push({
      ...job,
      lane: machine.key,
      status: job.status === 'running' ? 'running' : 'scheduled',
      scheduledStart: cursor.toISOString(),
      scheduledEnd: end.toISOString(),
      updatedAt: nowIso(),
      history: [{ at: nowIso(), action: 'auto-schedule', note: `Scheduled on ${machine.name}.` }, ...(job.history || [])].slice(0, 25),
    });
  }

  return scheduled;
}

function summary(jobs: PlannerJob[]) {
  const scheduledMinutes = jobs.reduce((sum, job) => sum + (job.status === 'scheduled' || job.status === 'running' ? Number(job.estimatedMinutes || 0) : 0), 0);
  return {
    total: jobs.length,
    waiting: jobs.filter((job) => job.status === 'waiting').length,
    scheduled: jobs.filter((job) => job.status === 'scheduled').length,
    running: jobs.filter((job) => job.status === 'running').length,
    paused: jobs.filter((job) => job.status === 'paused').length,
    blocked: jobs.filter((job) => job.status === 'blocked' || job.productionBlocked).length,
    complete: jobs.filter((job) => job.status === 'complete').length,
    scheduledMinutes,
    machines: machines.length,
  };
}

function lanes(jobs: PlannerJob[]) {
  return machines.map((machine) => {
    const laneJobs = jobs.filter((job) => job.lane === machine.key || job.machineKey === machine.key);
    const usedMinutes = laneJobs
      .filter((job) => job.status === 'scheduled' || job.status === 'running')
      .reduce((sum, job) => sum + Number(job.estimatedMinutes || 0), 0);
    return {
      ...machine,
      usedMinutes,
      freeMinutes: Math.max(0, machine.capacityMinutesToday - usedMinutes),
      jobs: laneJobs,
    };
  });
}

function updatePlannerJob(job: PlannerJob, action: string, note?: string): PlannerJob {
  let status = job.status;
  let productionBlocked = job.productionBlocked;
  let blockReason = job.blockReason;
  let priority = job.priority;

  if (action === 'start') status = productionBlocked ? 'blocked' : 'running';
  if (action === 'pause') status = 'paused';
  if (action === 'resume') status = productionBlocked ? 'blocked' : 'scheduled';
  if (action === 'complete') status = 'complete';
  if (action === 'rush') priority = 'rush';
  if (action === 'urgent') priority = 'urgent';
  if (action === 'normal-priority') priority = 'normal';
  if (action === 'block') {
    status = 'blocked';
    productionBlocked = true;
    blockReason = note || 'Blocked from machine planner.';
  }
  if (action === 'clear-block') {
    productionBlocked = false;
    blockReason = undefined;
    status = 'waiting';
  }

  return {
    ...job,
    status,
    productionBlocked,
    blockReason,
    priority,
    updatedAt: nowIso(),
    history: [{ at: nowIso(), action, note }, ...(job.history || [])].slice(0, 25),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-machine-planner',
    data: {
      machines,
      jobs: plannerStore.jobs,
      lanes: lanes(plannerStore.jobs),
      actions: plannerStore.actions,
      summary: summary(plannerStore.jobs),
      plannerActions: ['seed-from-board', 'auto-schedule', 'start', 'pause', 'resume', 'complete', 'block', 'clear-block', 'rush', 'urgent', 'normal-priority'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'auto-schedule');
    const now = nowIso();

    if (action === 'seed-from-board') {
      const incoming = Array.isArray(body.jobs) ? body.jobs : [];
      const mapped = incoming.slice(0, 30).map((job: any, index: number): PlannerJob => {
        const machineKey = String(job.machineKey || (String(job.jobType || '').includes('finish') ? 'finishing_bench' : 'konica_c4070'));
        const blocked = Boolean(job.productionBlocked || job.status === 'blocked');
        return {
          id: `planner-${String(job.id || Date.now() + index)}`,
          orderNumber: String(job.orderNumber || job.orderId || 'ORD-PLAN'),
          productName: String(job.productName || 'Production Job'),
          jobType: String(job.jobType || 'print'),
          machineKey,
          lane: machineKey,
          status: blocked ? 'blocked' : 'waiting',
          priority: String(job.priority || 'normal') as PlannerJob['priority'],
          estimatedMinutes: Number(job.estimatedMinutes || (String(job.jobType || '').includes('finish') ? 30 : 45)),
          productionBlocked: blocked,
          blockReason: job.blockReason ? String(job.blockReason) : undefined,
          history: [{ at: now, action: 'seed-from-board', note: 'Imported from production job board.' }],
          updatedAt: now,
        };
      });
      plannerStore.jobs = [...mapped, ...plannerStore.jobs].slice(0, 120);
    } else if (action === 'auto-schedule') {
      const priorityRank: Record<string, number> = { urgent: 0, rush: 1, normal: 2 };
      const sorted = [...plannerStore.jobs].sort((a, b) => (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2));
      plannerStore.jobs = scheduleJobs(sorted);
    } else {
      const jobId = String(body.jobId || body.id || '');
      const index = plannerStore.jobs.findIndex((job) => job.id === jobId);
      if (index < 0) return NextResponse.json({ ok: false, error: 'Planner job not found' }, { status: 404 });
      plannerStore.jobs[index] = updatePlannerJob(plannerStore.jobs[index], action, body.note ? String(body.note) : undefined);
    }

    plannerStore.actions = [{ id: `planner-action-${Date.now()}`, action, jobId: body.jobId || body.id || null, at: now }, ...plannerStore.actions].slice(0, 100);
    return NextResponse.json({
      ok: true,
      source: 'internal-production-machine-planner',
      data: { machines, jobs: plannerStore.jobs, lanes: lanes(plannerStore.jobs), actions: plannerStore.actions, summary: summary(plannerStore.jobs) },
      item: plannerStore.jobs.find((job) => job.id === String(body.jobId || body.id || '')) || null,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Machine planner update failed' }, { status: 500 });
  }
}
