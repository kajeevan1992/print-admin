import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RescheduleAction = {
  id: string;
  type: 'move_job' | 'assign_shift' | 'assign_operator' | 'remove_blocked_job' | 'split_capacity';
  jobId: string;
  conflictId?: string;
  from?: Record<string, unknown>;
  to?: Record<string, unknown>;
  reason: string;
};

type ReschedulePlan = {
  id: string;
  status: 'draft' | 'applied' | 'review-required';
  createdAt: string;
  source: string;
  actions: RescheduleAction[];
  summary: {
    conflictsReviewed: number;
    actionsSuggested: number;
    blockersHandled: number;
    warningsHandled: number;
  };
};

const nowIso = () => new Date().toISOString();

let rescheduleStore: { plans: ReschedulePlan[]; appliedJobs: any[]; actions: any[] } = {
  plans: [],
  appliedJobs: [],
  actions: [],
};

function addMinutes(dateValue: unknown, minutes: number) {
  const base = dateValue ? new Date(String(dateValue)) : new Date();
  const valid = Number.isFinite(base.getTime()) ? base : new Date();
  return new Date(valid.getTime() + minutes * 60_000).toISOString();
}

function estimateMinutes(job: any) {
  const minutes = Number(job?.estimatedMinutes || job?.durationMinutes || 45);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 45;
}

function jobKey(job: any) {
  return String(job?.id || job?.jobId || '');
}

function buildPlan(jobs: any[], conflicts: any[]) {
  const now = nowIso();
  const actions: RescheduleAction[] = [];
  const jobMap = new Map<string, any>();
  jobs.forEach((job) => {
    const key = jobKey(job);
    if (key) jobMap.set(key, job);
  });

  conflicts.forEach((conflict, index) => {
    const conflictId = String(conflict?.id || `conflict-${index}`);
    const type = String(conflict?.type || '');
    const severity = String(conflict?.severity || 'warning');

    if (type === 'blocked_job_scheduled') {
      const jobId = String(conflict?.jobId || '');
      const job = jobMap.get(jobId) || {};
      actions.push({
        id: `reschedule-action-remove-${jobId || index}`,
        type: 'remove_blocked_job',
        conflictId,
        jobId,
        from: { status: job.status, scheduledStart: job.scheduledStart, scheduledEnd: job.scheduledEnd, shiftId: job.shiftId },
        to: { status: 'blocked', scheduledStart: null, scheduledEnd: null, shiftId: null },
        reason: 'Blocked/preflight-failed jobs must not stay in an active production slot.',
      });
      return;
    }

    if (type === 'missing_shift') {
      const jobId = String(conflict?.jobId || '');
      const job = jobMap.get(jobId) || {};
      const start = addMinutes(now, 60 + actions.length * 30);
      actions.push({
        id: `reschedule-action-shift-${jobId || index}`,
        type: 'assign_shift',
        conflictId,
        jobId,
        from: { shiftId: job.shiftId, scheduledStart: job.scheduledStart, scheduledEnd: job.scheduledEnd },
        to: { shiftId: 'shift-auto-next', scheduledStart: start, scheduledEnd: addMinutes(start, estimateMinutes(job)) },
        reason: 'Job had no shift, so it is moved into the next available auto shift slot.',
      });
      return;
    }

    if (type === 'missing_operator') {
      const jobId = String(conflict?.jobId || '');
      const job = jobMap.get(jobId) || {};
      actions.push({
        id: `reschedule-action-operator-${jobId || index}`,
        type: 'assign_operator',
        conflictId,
        jobId,
        from: { operatorId: job.operatorId },
        to: { operatorId: 'operator-auto-print' },
        reason: 'Job had no operator, so it is assigned to the default available print operator.',
      });
      return;
    }

    if (type === 'machine_overlap' || type === 'operator_overlap') {
      const ids = Array.isArray(conflict?.jobIds) ? conflict.jobIds.map(String) : [];
      const jobId = ids[1] || ids[0] || String(conflict?.jobId || '');
      const job = jobMap.get(jobId) || {};
      const currentEnd = job?.scheduledEnd || now;
      const newStart = addMinutes(currentEnd, 15);
      actions.push({
        id: `reschedule-action-overlap-${jobId || index}`,
        type: 'move_job',
        conflictId,
        jobId,
        from: { scheduledStart: job.scheduledStart, scheduledEnd: job.scheduledEnd, machineKey: job.machineKey, operatorId: job.operatorId },
        to: { scheduledStart: newStart, scheduledEnd: addMinutes(newStart, estimateMinutes(job)) },
        reason: type === 'machine_overlap' ? 'Move the lower priority job after the machine overlap window.' : 'Move the lower priority job after the operator overlap window.',
      });
      return;
    }

    if (type === 'shift_capacity_breach') {
      const shiftId = String(conflict?.shiftId || '');
      const candidate = jobs.find((job) => String(job?.shiftId || '') === shiftId && String(job?.status || '') !== 'complete');
      const jobId = jobKey(candidate);
      const start = addMinutes(now, 240 + actions.length * 30);
      actions.push({
        id: `reschedule-action-capacity-${jobId || index}`,
        type: 'split_capacity',
        conflictId,
        jobId,
        from: { shiftId, scheduledStart: candidate?.scheduledStart, scheduledEnd: candidate?.scheduledEnd },
        to: { shiftId: 'shift-auto-following', scheduledStart: start, scheduledEnd: addMinutes(start, estimateMinutes(candidate)) },
        reason: 'Shift is over capacity, so one lower priority job is moved into a following shift.',
      });
      return;
    }

    if (severity === 'blocker') {
      const jobId = String(conflict?.jobId || '');
      actions.push({
        id: `reschedule-action-review-${jobId || index}`,
        type: 'move_job',
        conflictId,
        jobId,
        to: { reviewRequired: true },
        reason: 'Blocker requires planner review before production release.',
      });
    }
  });

  const plan: ReschedulePlan = {
    id: `reschedule-plan-${Date.now()}`,
    status: actions.some((action) => !action.jobId) ? 'review-required' : 'draft',
    createdAt: now,
    source: 'internal-production-reschedule',
    actions,
    summary: {
      conflictsReviewed: conflicts.length,
      actionsSuggested: actions.length,
      blockersHandled: conflicts.filter((item) => String(item?.severity || '') === 'blocker').length,
      warningsHandled: conflicts.filter((item) => String(item?.severity || '') === 'warning').length,
    },
  };

  return plan;
}

function applyPlanToJobs(jobs: any[], plan: ReschedulePlan) {
  const updates = new Map(plan.actions.map((action) => [action.jobId, action]));
  return jobs.map((job) => {
    const key = jobKey(job);
    const action = updates.get(key);
    if (!action) return job;
    const to = action.to || {};
    return {
      ...job,
      ...to,
      rescheduleStatus: action.type,
      rescheduleReason: action.reason,
      lastRescheduledAt: nowIso(),
    };
  });
}

function summarize() {
  const latest = rescheduleStore.plans[0];
  return {
    plans: rescheduleStore.plans.length,
    latestStatus: latest?.status || 'none',
    latestActions: latest?.actions?.length || 0,
    appliedJobs: rescheduleStore.appliedJobs.length,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-reschedule',
    data: {
      plans: rescheduleStore.plans,
      appliedJobs: rescheduleStore.appliedJobs,
      actions: rescheduleStore.actions,
      summary: summarize(),
      supportedActions: ['build-plan', 'apply-plan', 'clear'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'build-plan');
    const now = nowIso();

    if (action === 'clear') {
      rescheduleStore = { plans: [], appliedJobs: [], actions: [] };
    } else if (action === 'apply-plan') {
      const plan = (body.plan || rescheduleStore.plans[0]) as ReschedulePlan | undefined;
      if (!plan) return NextResponse.json({ ok: false, error: 'No reschedule plan found' }, { status: 404 });
      const jobs = Array.isArray(body.jobs) ? body.jobs : rescheduleStore.appliedJobs;
      const appliedJobs = applyPlanToJobs(jobs, plan);
      const appliedPlan = { ...plan, status: 'applied' as const };
      rescheduleStore.appliedJobs = appliedJobs;
      rescheduleStore.plans = [appliedPlan, ...rescheduleStore.plans.filter((item) => item.id !== plan.id)].slice(0, 20);
    } else {
      const jobs = Array.isArray(body.jobs) ? body.jobs : [];
      const conflicts = Array.isArray(body.conflicts) ? body.conflicts : [];
      const plan = buildPlan(jobs, conflicts);
      rescheduleStore.plans = [plan, ...rescheduleStore.plans].slice(0, 20);
    }

    rescheduleStore.actions = [{ id: `reschedule-action-${Date.now()}`, action, at: now }, ...rescheduleStore.actions].slice(0, 100);

    return NextResponse.json({
      ok: true,
      source: 'internal-production-reschedule',
      data: {
        plans: rescheduleStore.plans,
        appliedJobs: rescheduleStore.appliedJobs,
        actions: rescheduleStore.actions,
        summary: summarize(),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production reschedule failed' }, { status: 500 });
  }
}
