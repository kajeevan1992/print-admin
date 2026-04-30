import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ConflictSeverity = 'info' | 'warning' | 'blocker';
type ConflictStatus = 'open' | 'reviewing' | 'resolved' | 'blocked';

type Conflict = {
  id: string;
  type: string;
  severity: ConflictSeverity;
  status: ConflictStatus;
  jobId?: string;
  jobIds?: string[];
  machineKey?: string;
  operatorId?: string;
  shiftId?: string;
  message: string;
  suggestion: string;
  createdAt: string;
  resolvedAt?: string;
};

const nowIso = () => new Date().toISOString();

let conflictStore: { conflicts: Conflict[]; suggestions: any[]; actions: any[] } = {
  conflicts: [],
  suggestions: [],
  actions: [],
};

function overlaps(a: any, b: any) {
  if (!a?.scheduledStart || !a?.scheduledEnd || !b?.scheduledStart || !b?.scheduledEnd) return false;
  const aStart = new Date(a.scheduledStart).getTime();
  const aEnd = new Date(a.scheduledEnd).getTime();
  const bStart = new Date(b.scheduledStart).getTime();
  const bEnd = new Date(b.scheduledEnd).getTime();
  return Number.isFinite(aStart) && Number.isFinite(aEnd) && Number.isFinite(bStart) && Number.isFinite(bEnd) && aStart < bEnd && bStart < aEnd;
}

function detectConflicts(jobs: any[]) {
  const conflicts: Conflict[] = [];
  const suggestions: any[] = [];
  const seen = new Set<string>();
  const now = nowIso();

  for (const job of jobs) {
    const jobId = String(job.id || job.jobId || 'unknown-job');
    const status = String(job.status || '');

    if ((job.productionBlocked || status === 'blocked') && (status === 'scheduled' || status === 'running')) {
      conflicts.push({
        id: `conflict-blocked-${jobId}`,
        type: 'blocked_job_scheduled',
        severity: 'blocker',
        status: 'open',
        jobId,
        machineKey: job.machineKey,
        operatorId: job.operatorId,
        shiftId: job.shiftId,
        message: 'A blocked/preflight-failed job is still scheduled or running.',
        suggestion: 'Remove it from the active shift, keep it blocked, or apply a manager override with reason before production release.',
        createdAt: now,
      });
    }

    if (!job.shiftId && status !== 'complete' && status !== 'blocked') {
      conflicts.push({
        id: `conflict-no-shift-${jobId}`,
        type: 'missing_shift',
        severity: 'warning',
        status: 'open',
        jobId,
        machineKey: job.machineKey,
        message: 'Job has no assigned shift.',
        suggestion: 'Auto-assign the job to the next shift with matching machine capacity.',
        createdAt: now,
      });
    }

    if (!job.operatorId && status !== 'complete' && status !== 'blocked') {
      conflicts.push({
        id: `conflict-no-operator-${jobId}`,
        type: 'missing_operator',
        severity: 'warning',
        status: 'open',
        jobId,
        machineKey: job.machineKey,
        shiftId: job.shiftId,
        message: 'Job has no assigned operator.',
        suggestion: 'Assign an operator with the right machine/material skill before starting.',
        createdAt: now,
      });
    }
  }

  for (let i = 0; i < jobs.length; i += 1) {
    for (let j = i + 1; j < jobs.length; j += 1) {
      const a = jobs[i];
      const b = jobs[j];
      const aId = String(a.id || a.jobId || `job-${i}`);
      const bId = String(b.id || b.jobId || `job-${j}`);

      if (!overlaps(a, b)) continue;

      if (a.machineKey && a.machineKey === b.machineKey) {
        const key = `machine-${a.machineKey}-${aId}-${bId}`;
        if (!seen.has(key)) {
          seen.add(key);
          conflicts.push({
            id: `conflict-${key}`,
            type: 'machine_overlap',
            severity: 'blocker',
            status: 'open',
            jobIds: [aId, bId],
            machineKey: String(a.machineKey),
            shiftId: String(a.shiftId || b.shiftId || ''),
            message: 'Two jobs overlap on the same machine.',
            suggestion: 'Move the lower priority job to the next free slot or another compatible machine lane.',
            createdAt: now,
          });
        }
      }

      if (a.operatorId && a.operatorId === b.operatorId) {
        const key = `operator-${a.operatorId}-${aId}-${bId}`;
        if (!seen.has(key)) {
          seen.add(key);
          conflicts.push({
            id: `conflict-${key}`,
            type: 'operator_overlap',
            severity: 'blocker',
            status: 'open',
            jobIds: [aId, bId],
            operatorId: String(a.operatorId),
            shiftId: String(a.shiftId || b.shiftId || ''),
            message: 'One operator is assigned to overlapping jobs.',
            suggestion: 'Reassign one job to another skilled operator or reschedule it later in the shift.',
            createdAt: now,
          });
        }
      }
    }
  }

  const byShift = new Map<string, any[]>();
  for (const job of jobs) {
    if (!job.shiftId) continue;
    const key = String(job.shiftId);
    byShift.set(key, [...(byShift.get(key) || []), job]);
  }

  byShift.forEach((shiftJobs, shiftId) => {
    const used = shiftJobs.reduce((sum, job) => sum + Number(job.estimatedMinutes || 0), 0);
    if (used > 240) {
      conflicts.push({
        id: `conflict-capacity-${shiftId}`,
        type: 'shift_capacity_breach',
        severity: 'warning',
        status: 'open',
        shiftId,
        message: `Shift is over capacity by ${used - 240} minutes.`,
        suggestion: 'Move lower priority jobs into the next shift or split long running jobs.',
        createdAt: now,
      });
    }
  });

  for (const conflict of conflicts) {
    suggestions.push({
      id: `suggestion-${conflict.id}`,
      conflictId: conflict.id,
      action: conflict.type.includes('overlap') ? 'reschedule-lower-priority' : conflict.type === 'blocked_job_scheduled' ? 'remove-from-active-plan' : 'auto-assign',
      label: conflict.suggestion,
      createdAt: now,
    });
  }

  return { conflicts, suggestions };
}

function summarize(conflicts: Conflict[]) {
  return {
    total: conflicts.length,
    open: conflicts.filter((item) => item.status === 'open').length,
    blockers: conflicts.filter((item) => item.severity === 'blocker' && item.status !== 'resolved').length,
    warnings: conflicts.filter((item) => item.severity === 'warning' && item.status !== 'resolved').length,
    resolved: conflicts.filter((item) => item.status === 'resolved').length,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-conflicts',
    data: {
      conflicts: conflictStore.conflicts,
      suggestions: conflictStore.suggestions,
      actions: conflictStore.actions,
      summary: summarize(conflictStore.conflicts),
      supportedChecks: ['machine_overlap', 'operator_overlap', 'shift_capacity_breach', 'missing_shift', 'missing_operator', 'blocked_job_scheduled'],
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'analyze-from-shift-planner');
    const now = nowIso();

    if (action === 'analyze-from-shift-planner') {
      const jobs = Array.isArray(body.jobs) ? body.jobs : [];
      const result = detectConflicts(jobs);
      conflictStore.conflicts = result.conflicts;
      conflictStore.suggestions = result.suggestions;
    } else {
      const conflictId = String(body.conflictId || body.id || '');
      const index = conflictStore.conflicts.findIndex((item) => item.id === conflictId);
      if (index < 0) return NextResponse.json({ ok: false, error: 'Conflict not found' }, { status: 404 });
      const current = conflictStore.conflicts[index];
      if (action === 'resolve') conflictStore.conflicts[index] = { ...current, status: 'resolved', resolvedAt: now };
      if (action === 'review') conflictStore.conflicts[index] = { ...current, status: 'reviewing' };
      if (action === 'block') conflictStore.conflicts[index] = { ...current, status: 'blocked', severity: 'blocker' };
    }

    conflictStore.actions = [{ id: `conflict-action-${Date.now()}`, action, conflictId: body.conflictId || body.id || null, at: now }, ...conflictStore.actions].slice(0, 100);
    return NextResponse.json({
      ok: true,
      source: 'internal-production-conflicts',
      data: { conflicts: conflictStore.conflicts, suggestions: conflictStore.suggestions, actions: conflictStore.actions, summary: summarize(conflictStore.conflicts) },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production conflict check failed' }, { status: 500 });
  }
}
