'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  Factory,
  FileWarning,
  PackageCheck,
  Printer,
  Search,
  ShieldCheck,
  StickyNote,
  Truck,
  UserCheck
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { operationsService } from '@/services/operations.service';
import type { ProductionJob } from '@/data/operations';

const stageOrder: ProductionJob['stage'][] = ['queued', 'proofing', 'printing', 'finishing', 'shipped'];
const stageLabels: Record<ProductionJob['stage'], string> = {
  queued: 'Queued',
  proofing: 'Proofing',
  printing: 'Printing',
  finishing: 'Finishing',
  shipped: 'Shipped'
};

const artworkStatusOptions: NonNullable<ProductionJob['artworkStatus']>[] = ['missing', 'uploaded', 'preflight-review', 'changes-requested', 'approved'];
const preflightStatusOptions: NonNullable<ProductionJob['preflightStatus']>[] = ['pending', 'pass', 'warning', 'fail', 'override'];
const priorityOptions: NonNullable<ProductionJob['priority']>[] = ['standard', 'priority', 'rush'];
const dispatchOptions: NonNullable<ProductionJob['dispatchMethod']>[] = ['collection', 'local-delivery', 'courier', 'royal-mail'];
const handoffOptions: NonNullable<ProductionJob['handoffState']>[] = ['needs-artwork', 'ready-for-print', 'printing', 'finishing', 'ready-to-dispatch', 'dispatched', 'blocked'];

const emptyJob: ProductionJob = {
  id: '',
  orderNumber: '',
  customer: '',
  product: '',
  plant: 'Nevada DC',
  stage: 'queued',
  slaRisk: 'low',
  dueDate: '',
  artworkStatus: 'missing',
  preflightStatus: 'pending',
  assignedOperator: 'Unassigned',
  machineName: 'Unassigned',
  priority: 'standard',
  productionNotes: '',
  dispatchMethod: 'collection',
  handoffState: 'needs-artwork'
};

function stageTone(stage: ProductionJob['stage']) {
  switch (stage) {
    case 'queued':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
    case 'proofing':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    case 'printing':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
    case 'finishing':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-200';
    case 'shipped':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }
}

function riskTone(risk: ProductionJob['slaRisk']) {
  switch (risk) {
    case 'high':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'medium':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    default:
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }
}

function preflightTone(status?: ProductionJob['preflightStatus']) {
  switch (status) {
    case 'pass':
    case 'override':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    case 'fail':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    default:
      return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
  }
}

function artworkTone(status?: ProductionJob['artworkStatus']) {
  switch (status) {
    case 'approved':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    case 'uploaded':
    case 'preflight-review':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
    case 'changes-requested':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    default:
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  }
}

function handoffTone(state?: ProductionJob['handoffState']) {
  switch (state) {
    case 'blocked':
    case 'needs-artwork':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'ready-for-print':
    case 'ready-to-dispatch':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    case 'printing':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
    case 'finishing':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-200';
    case 'dispatched':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    default:
      return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
  }
}

function priorityTone(priority?: ProductionJob['priority']) {
  switch (priority) {
    case 'rush':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'priority':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    default:
      return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
  }
}

function dueLabel(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (Number.isNaN(diff)) return 'No due date';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff}d`;
}

function isOverdue(dueDate: string) {
  return dueLabel(dueDate).includes('overdue');
}

function cleanLabel(value?: string) {
  return value ? value.replace(/-/g, ' ') : 'not set';
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] capitalize ${tone}`}>{children}</span>;
}

export function ProductionBoardPage() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [search, setSearch] = useState('');
  const [plant, setPlant] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [handoffFilter, setHandoffFilter] = useState('all');
  const [editing, setEditing] = useState<ProductionJob | null>(null);

  const load = async () => setJobs(await operationsService.getProductionJobs());
  useEffect(() => { load(); }, []);

  const plants = useMemo(() => ['all', ...new Set(jobs.map((job) => job.plant))], [jobs]);

  const filtered = useMemo(() => jobs.filter((job) => {
    const text = `${job.orderNumber} ${job.customer ?? ''} ${job.product} ${job.plant} ${job.assignedOperator ?? ''} ${job.machineName ?? ''}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesPlant = plant === 'all' || job.plant === plant;
    const matchesRisk = riskFilter === 'all' || job.slaRisk === riskFilter;
    const matchesHandoff = handoffFilter === 'all' || job.handoffState === handoffFilter;
    return matchesSearch && matchesPlant && matchesRisk && matchesHandoff;
  }), [handoffFilter, jobs, plant, riskFilter, search]);

  const grouped = useMemo(() => Object.fromEntries(stageOrder.map((stage) => [stage, filtered.filter((job) => job.stage === stage)])) as Record<ProductionJob['stage'], ProductionJob[]>, [filtered]);

  const stats = useMemo(() => ({
    total: filtered.length,
    highRisk: filtered.filter((job) => job.slaRisk === 'high').length,
    dueToday: filtered.filter((job) => dueLabel(job.dueDate) === 'Due today').length,
    overdue: filtered.filter((job) => isOverdue(job.dueDate)).length,
    blocked: filtered.filter((job) => job.handoffState === 'blocked' || job.preflightStatus === 'fail').length,
    readyToDispatch: filtered.filter((job) => job.handoffState === 'ready-to-dispatch' || job.stage === 'shipped').length,
    plants: new Set(filtered.map((job) => job.plant)).size
  }), [filtered]);

  const moveJob = async (job: ProductionJob, direction: 'left' | 'right') => {
    const currentIndex = stageOrder.indexOf(job.stage);
    const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= stageOrder.length) return;
    const nextStage = stageOrder[nextIndex];
    const nextHandoffState: ProductionJob['handoffState'] = nextStage === 'printing'
      ? 'printing'
      : nextStage === 'finishing'
        ? 'finishing'
        : nextStage === 'shipped'
          ? 'dispatched'
          : job.handoffState;
    await operationsService.saveProductionJob({ ...job, stage: nextStage, handoffState: nextHandoffState });
    await load();
  };

  const createJob = () => {
    setEditing({
      ...emptyJob,
      id: `pj-${Date.now()}`,
      orderNumber: `ORD-${Math.floor(Math.random() * 90000) + 10000}`,
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    });
  };

  const saveEditing = async () => {
    if (!editing) return;
    await operationsService.saveProductionJob(editing);
    setEditing(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Board"
        subtitle="Live workflow board for artwork handoff, preflight, print, finishing, dispatch readiness, operator notes, and SLA risk. Planner remains the separate scheduling and capacity view."
        actions={<>
          <Button onClick={load}>Refresh</Button>
          <PrimaryButton onClick={createJob}>Add Job</PrimaryButton>
        </>}
      />

      <Card className="border-sky-500/20 bg-sky-500/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Internal workflow surface</p>
            <p className="mt-2 text-sm text-textMuted">This board now tracks operational status. Use Production Planner for Gantt scheduling, machine capacity, and auto-scheduling.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <StatusPill tone="border-sky-500/30 bg-sky-500/10 text-sky-200">Board = workflow</StatusPill>
            <StatusPill tone="border-violet-500/30 bg-violet-500/10 text-violet-200">Planner = schedule</StatusPill>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card><p className="text-xs uppercase text-textMuted">Jobs on board</p><p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">High SLA risk</p><p className="mt-2 text-3xl font-semibold text-white">{stats.highRisk}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Due today</p><p className="mt-2 text-3xl font-semibold text-white">{stats.dueToday}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Overdue</p><p className="mt-2 text-3xl font-semibold text-white">{stats.overdue}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Blocked</p><p className="mt-2 text-3xl font-semibold text-white">{stats.blocked}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Ready dispatch</p><p className="mt-2 text-3xl font-semibold text-white">{stats.readyToDispatch}</p></Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
            <Input className="pl-9" placeholder="Search order, customer, product, plant, operator or machine..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={plant} options={plants} onChange={(e) => setPlant(e.target.value)} />
          <Select value={riskFilter} options={['all', 'low', 'medium', 'high']} onChange={(e) => setRiskFilter(e.target.value)} />
          <Select value={handoffFilter} options={['all', ...handoffOptions]} onChange={(e) => setHandoffFilter(e.target.value)} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        {stageOrder.map((stage) => (
          <Card key={stage} className="overflow-hidden p-0">
            <div className="border-b border-white/6 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{stageLabels[stage]}</p>
                  <p className="text-xs text-textMuted">{grouped[stage].length} jobs</p>
                </div>
                <StatusPill tone={stageTone(stage)}>{stageLabels[stage]}</StatusPill>
              </div>
            </div>

            <div className="space-y-3 p-3">
              {grouped[stage].length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.02] px-3 py-5 text-center text-xs text-textMuted">No jobs in this lane</div>
              ) : grouped[stage].map((job) => {
                const overdue = isOverdue(job.dueDate);
                const blocked = job.handoffState === 'blocked' || job.preflightStatus === 'fail';
                return (
                  <div key={job.id} className={`rounded-2xl border bg-white/[0.02] p-3 ${blocked ? 'border-rose-500/30' : overdue ? 'border-amber-500/30' : 'border-white/6'}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{job.orderNumber}</p>
                        <p className="mt-1 text-xs text-textMuted">{job.customer || 'Customer not set'}</p>
                        <p className="mt-1 text-xs text-textMuted">{job.product}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusPill tone={riskTone(job.slaRisk)}>{job.slaRisk} risk</StatusPill>
                        <StatusPill tone={priorityTone(job.priority)}>{job.priority || 'standard'}</StatusPill>
                      </div>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                      <StatusPill tone={artworkTone(job.artworkStatus)}>Artwork {cleanLabel(job.artworkStatus)}</StatusPill>
                      <StatusPill tone={preflightTone(job.preflightStatus)}>Preflight {cleanLabel(job.preflightStatus)}</StatusPill>
                      <StatusPill tone={handoffTone(job.handoffState)}>{cleanLabel(job.handoffState)}</StatusPill>
                    </div>

                    <div className="space-y-2 text-xs text-textMuted">
                      <div className="flex items-center gap-2"><Factory size={14} /> <span>{job.plant}</span></div>
                      <div className="flex items-center gap-2"><CalendarClock size={14} /> <span className={overdue ? 'font-semibold text-amber-200' : ''}>{dueLabel(job.dueDate)}</span></div>
                      <div className="flex items-center gap-2"><UserCheck size={14} /> <span>{job.assignedOperator || 'Operator not assigned'}</span></div>
                      <div className="flex items-center gap-2"><Printer size={14} /> <span>{job.machineName || 'Machine not assigned'}</span></div>
                      <div className="flex items-center gap-2"><Truck size={14} /> <span>{cleanLabel(job.dispatchMethod)}</span></div>
                    </div>

                    {job.productionNotes ? (
                      <div className="mt-3 rounded-xl border border-white/6 bg-white/[0.03] p-3 text-xs text-textMuted">
                        <span className="inline-flex items-center gap-2 text-white"><StickyNote size={14} /> Notes</span>
                        <p className="mt-1 leading-5">{job.productionNotes}</p>
                      </div>
                    ) : null}

                    {blocked ? (
                      <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                        <span className="inline-flex items-center gap-2"><FileWarning size={14} /> Blocked: fix artwork/preflight before moving forward.</span>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={() => setEditing(job)}>Edit</Button>
                      <Button onClick={() => moveJob(job, 'left')} disabled={job.stage === 'queued'}>Back</Button>
                      <PrimaryButton onClick={() => moveJob(job, 'right')} disabled={job.stage === 'shipped' || blocked}>
                        <span className="inline-flex items-center gap-1">Advance <ArrowRight size={14} /></span>
                      </PrimaryButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <h3 className="text-base font-semibold text-white">Workflow Guidance</h3>
          <ul className="mt-3 space-y-2 text-sm text-textMuted">
            <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">Resolve missing artwork, failed preflight, or blocked handoff states before advancing jobs.</li>
            <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">Use operator and machine fields for shift handover without changing the planner schedule.</li>
            <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">Dispatch method and ready-to-dispatch state help front counter, local delivery, and courier teams coordinate collections.</li>
          </ul>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-white">Plant Snapshot</h3>
          <div className="mt-3 space-y-2 text-sm text-textMuted">
            {plants.filter((item) => item !== 'all').map((currentPlant) => {
              const count = filtered.filter((job) => job.plant === currentPlant).length;
              return (
                <div key={currentPlant} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                  <span>{currentPlant}</span>
                  <span className="text-white">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-white">Dispatch Readiness</h3>
          <div className="mt-3 rounded-2xl border border-white/6 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-sm text-white"><Truck size={16} /> Jobs ready to dispatch</div>
            <p className="mt-3 text-4xl font-semibold text-white">{stats.readyToDispatch}</p>
            <p className="mt-2 text-sm text-textMuted">Coordinate collection, local delivery, courier, and Royal Mail handoff from the board.</p>
            {stats.blocked > 0 ? (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                <span className="inline-flex items-center gap-2"><AlertTriangle size={14} /> {stats.blocked} jobs are blocked by artwork/preflight/workflow state.</span>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                <span className="inline-flex items-center gap-2"><ShieldCheck size={14} /> No blocked jobs in this filtered board.</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.orderNumber}` : 'Edit job'}>
        {editing ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={editing.orderNumber} onChange={(e) => setEditing({ ...editing, orderNumber: e.target.value })} placeholder="Order Number" />
              <Input value={editing.customer ?? ''} onChange={(e) => setEditing({ ...editing, customer: e.target.value })} placeholder="Customer" />
              <Input value={editing.product} onChange={(e) => setEditing({ ...editing, product: e.target.value })} placeholder="Product" />
              <Select value={editing.plant} options={['Nevada DC', 'Texas Plant', 'New Jersey Hub']} onChange={(e) => setEditing({ ...editing, plant: e.target.value })} />
              <Select value={editing.stage} options={stageOrder} onChange={(e) => setEditing({ ...editing, stage: e.target.value as ProductionJob['stage'] })} />
              <Select value={editing.slaRisk} options={['low', 'medium', 'high']} onChange={(e) => setEditing({ ...editing, slaRisk: e.target.value as ProductionJob['slaRisk'] })} />
              <Select value={editing.artworkStatus ?? 'missing'} options={artworkStatusOptions} onChange={(e) => setEditing({ ...editing, artworkStatus: e.target.value as ProductionJob['artworkStatus'] })} />
              <Select value={editing.preflightStatus ?? 'pending'} options={preflightStatusOptions} onChange={(e) => setEditing({ ...editing, preflightStatus: e.target.value as ProductionJob['preflightStatus'] })} />
              <Select value={editing.priority ?? 'standard'} options={priorityOptions} onChange={(e) => setEditing({ ...editing, priority: e.target.value as ProductionJob['priority'] })} />
              <Select value={editing.handoffState ?? 'needs-artwork'} options={handoffOptions} onChange={(e) => setEditing({ ...editing, handoffState: e.target.value as ProductionJob['handoffState'] })} />
              <Input value={editing.assignedOperator ?? ''} onChange={(e) => setEditing({ ...editing, assignedOperator: e.target.value })} placeholder="Assigned operator" />
              <Input value={editing.machineName ?? ''} onChange={(e) => setEditing({ ...editing, machineName: e.target.value })} placeholder="Machine name" />
              <Select value={editing.dispatchMethod ?? 'collection'} options={dispatchOptions} onChange={(e) => setEditing({ ...editing, dispatchMethod: e.target.value as ProductionJob['dispatchMethod'] })} />
              <Input type="date" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} />
            </div>
            <Input value={editing.productionNotes ?? ''} onChange={(e) => setEditing({ ...editing, productionNotes: e.target.value })} placeholder="Production notes / shift handover note" />
            <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3 text-xs text-textMuted">
              <span className="inline-flex items-center gap-2 text-white"><ClipboardCheck size={14} /> Workflow reminder</span>
              <p className="mt-1 leading-5">Use this board to manage status, preflight, operator notes, and dispatch handoff. Use Production Planner for machine scheduling and capacity.</p>
            </div>
            <div className="flex justify-between gap-2">
              <Button onClick={async () => { await operationsService.deleteProductionJob(editing.id); setEditing(null); await load(); }}>Delete</Button>
              <div className="flex gap-2">
                <Button onClick={() => setEditing(null)}>Cancel</Button>
                <PrimaryButton onClick={saveEditing}>Save Job</PrimaryButton>
              </div>
            </div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
