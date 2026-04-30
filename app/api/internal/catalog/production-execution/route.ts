import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ExecutionEvent = {
  id: string;
  jobId: string;
  action: string;
  status: string;
  at: string;
  operatorId?: string;
  machineKey?: string;
  note?: string;
  progressPercent?: number;
};

type ExecutionJob = Record<string, any> & {
  id: string;
  executionStatus: 'waiting' | 'running' | 'paused' | 'blocked' | 'completed';
  progressPercent: number;
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  lastExecutionAt?: string;
  executionNotes?: string[];
};

let store: { jobs: ExecutionJob[]; events: ExecutionEvent[] } = {
  jobs: [],
  events: [],
};

const nowIso = () => new Date().toISOString();

function jobIdFrom(job: any, index = 0) {
  return String(job?.id || job?.jobId || `execution-job-${index + 1}`);
}

function normalizeJob(job: any, index = 0): ExecutionJob {
  const isBlocked = Boolean(job?.productionBlocked) || String(job?.productionStatus || '').includes('blocked') || String(job?.status || '').includes('blocked');
  const complete = ['complete', 'completed', 'done'].includes(String(job?.status || job?.executionStatus || '').toLowerCase());
  return {
    ...job,
    id: jobIdFrom(job, index),
    executionStatus: isBlocked ? 'blocked' : complete ? 'completed' : String(job?.executionStatus || 'waiting') as ExecutionJob['executionStatus'],
    progressPercent: Number.isFinite(Number(job?.progressPercent)) ? Math.max(0, Math.min(100, Number(job.progressPercent))) : complete ? 100 : 0,
    executionNotes: Array.isArray(job?.executionNotes) ? job.executionNotes : [],
  };
}

function summarize() {
  return {
    total: store.jobs.length,
    waiting: store.jobs.filter((job) => job.executionStatus === 'waiting').length,
    running: store.jobs.filter((job) => job.executionStatus === 'running').length,
    paused: store.jobs.filter((job) => job.executionStatus === 'paused').length,
    blocked: store.jobs.filter((job) => job.executionStatus === 'blocked').length,
    completed: store.jobs.filter((job) => job.executionStatus === 'completed').length,
    avgProgress: store.jobs.length ? Math.round(store.jobs.reduce((sum, job) => sum + Number(job.progressPercent || 0), 0) / store.jobs.length) : 0,
  };
}

function addEvent(job: ExecutionJob, action: string, extras: Partial<ExecutionEvent> = {}) {
  const event: ExecutionEvent = {
    id: `execution-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    jobId: job.id,
    action,
    status: job.executionStatus,
    at: nowIso(),
    operatorId: String(job.operatorId || extras.operatorId || ''),
    machineKey: String(job.machineKey || extras.machineKey || ''),
    note: extras.note,
    progressPercent: job.progressPercent,
  };
  store.events = [event, ...store.events].slice(0, 200);
  return event;
}

function updateJob(jobId: string, updater: (job: ExecutionJob) => ExecutionJob) {
  let updated: ExecutionJob | null = null;
  store.jobs = store.jobs.map((job) => {
    if (job.id !== jobId) return job;
    updated = updater(job);
    return updated;
  });
  return updated;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-execution',
    data: {
      items: store.jobs,
      events: store.events,
      summary: summarize(),
      supportedActions: ['seed-from-reschedule', 'start', 'pause', 'resume', 'progress', 'checkpoint', 'block', 'complete', 'clear'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'checkpoint');
    const now = nowIso();

    if (action === 'clear') {
      store = { jobs: [], events: [] };
      return NextResponse.json({ ok: true, source: 'internal-production-execution', data: { items: store.jobs, events: store.events, summary: summarize() } });
    }

    if (action === 'seed-from-reschedule') {
      const jobs = Array.isArray(body.jobs) ? body.jobs : [];
      store.jobs = jobs.map(normalizeJob).slice(0, 100);
      store.jobs.forEach((job) => addEvent(job, 'seed-from-reschedule', { note: 'Execution job seeded from planner/reschedule output.' }));
      return NextResponse.json({ ok: true, source: 'internal-production-execution', data: { items: store.jobs, events: store.events, summary: summarize() } });
    }

    const jobId = String(body.jobId || '');
    if (!jobId) return NextResponse.json({ ok: false, error: 'jobId is required' }, { status: 400 });

    const existing = store.jobs.find((job) => job.id === jobId);
    if (!existing) return NextResponse.json({ ok: false, error: 'Execution job not found' }, { status: 404 });

    if (existing.executionStatus === 'blocked' && !['checkpoint', 'clear-block'].includes(action)) {
      return NextResponse.json({ ok: false, error: 'Blocked jobs cannot be started without clearing the production block.' }, { status: 409 });
    }

    const updated = updateJob(jobId, (job) => {
      const note = String(body.note || '').trim();
      const notes = note ? [note, ...(job.executionNotes || [])].slice(0, 20) : (job.executionNotes || []);
      if (action === 'start' || action === 'resume') {
        return { ...job, executionStatus: 'running', startedAt: job.startedAt || now, pausedAt: undefined, lastExecutionAt: now, progressPercent: Math.max(1, Number(job.progressPercent || 0)), executionNotes: notes };
      }
      if (action === 'pause') {
        return { ...job, executionStatus: 'paused', pausedAt: now, lastExecutionAt: now, executionNotes: notes };
      }
      if (action === 'progress') {
        const progress = Math.max(0, Math.min(100, Number(body.progressPercent ?? job.progressPercent ?? 0)));
        return { ...job, executionStatus: progress >= 100 ? 'completed' : job.executionStatus === 'waiting' ? 'running' : job.executionStatus, progressPercent: progress, completedAt: progress >= 100 ? now : job.completedAt, lastExecutionAt: now, executionNotes: notes };
      }
      if (action === 'block') {
        return { ...job, executionStatus: 'blocked', productionBlocked: true, blockReason: note || 'Blocked during production execution.', lastExecutionAt: now, executionNotes: notes };
      }
      if (action === 'clear-block') {
        return { ...job, executionStatus: 'waiting', productionBlocked: false, blockReason: '', lastExecutionAt: now, executionNotes: notes };
      }
      if (action === 'complete') {
        return { ...job, executionStatus: 'completed', progressPercent: 100, completedAt: now, lastExecutionAt: now, executionNotes: notes };
      }
      return { ...job, lastExecutionAt: now, executionNotes: notes };
    });

    if (updated) addEvent(updated, action, { note: String(body.note || '') });

    return NextResponse.json({
      ok: true,
      source: 'internal-production-execution',
      data: { items: store.jobs, events: store.events, summary: summarize() },
      item: updated,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production execution update failed' }, { status: 500 });
  }
}
