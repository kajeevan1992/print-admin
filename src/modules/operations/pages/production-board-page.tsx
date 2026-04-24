'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, Factory, PackageCheck, Search, Truck } from 'lucide-react';
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

const emptyJob: ProductionJob = {
  id: '',
  orderNumber: '',
  product: '',
  plant: 'Nevada DC',
  stage: 'queued',
  slaRisk: 'low',
  dueDate: ''
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

export function ProductionBoardPage() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [search, setSearch] = useState('');
  const [plant, setPlant] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [editing, setEditing] = useState<ProductionJob | null>(null);

  const load = async () => setJobs(await operationsService.getProductionJobs());
  useEffect(() => { load(); }, []);

  const plants = useMemo(() => ['all', ...new Set(jobs.map((job) => job.plant))], [jobs]);

  const filtered = useMemo(() => jobs.filter((job) => {
    const text = `${job.orderNumber} ${job.product} ${job.plant}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesPlant = plant === 'all' || job.plant === plant;
    const matchesRisk = riskFilter === 'all' || job.slaRisk === riskFilter;
    return matchesSearch && matchesPlant && matchesRisk;
  }), [jobs, plant, riskFilter, search]);

  const grouped = useMemo(() => Object.fromEntries(stageOrder.map((stage) => [stage, filtered.filter((job) => job.stage === stage)])) as Record<ProductionJob['stage'], ProductionJob[]>, [filtered]);

  const stats = useMemo(() => ({
    total: filtered.length,
    highRisk: filtered.filter((job) => job.slaRisk === 'high').length,
    dueToday: filtered.filter((job) => dueLabel(job.dueDate) === 'Due today').length,
    plants: new Set(filtered.map((job) => job.plant)).size
  }), [filtered]);

  const moveJob = async (job: ProductionJob, direction: 'left' | 'right') => {
    const currentIndex = stageOrder.indexOf(job.stage);
    const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= stageOrder.length) return;
    await operationsService.saveProductionJob({ ...job, stage: stageOrder[nextIndex] });
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
        subtitle="Run a visual production queue across proofing, print, finishing, and dispatch. This is the front-end planning surface before API and database wiring."
        actions={<>
          <Button onClick={load}>Refresh</Button>
          <PrimaryButton onClick={createJob}>Add Job</PrimaryButton>
        </>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs uppercase text-textMuted">Jobs on board</p><p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">High SLA risk</p><p className="mt-2 text-3xl font-semibold text-white">{stats.highRisk}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Due today</p><p className="mt-2 text-3xl font-semibold text-white">{stats.dueToday}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Plants active</p><p className="mt-2 text-3xl font-semibold text-white">{stats.plants}</p></Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
            <Input className="pl-9" placeholder="Search order, product, || plant..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={plant} options={plants} onChange={(e) => setPlant(e.target.value)} />
          <Select value={riskFilter} options={['all', 'low', 'medium', 'high']} onChange={(e) => setRiskFilter(e.target.value)} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        {stageOrder.map((stage) => (
          <Card key={stage} className="p-0 overflow-hidden">
            <div className="border-b border-white/6 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{stageLabels[stage]}</p>
                  <p className="text-xs text-textMuted">{grouped[stage].length} jobs</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${stageTone(stage)}`}>{stageLabels[stage]}</span>
              </div>
            </div>

            <div className="space-y-3 p-3">
              {grouped[stage].length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.02] px-3 py-5 text-center text-xs text-textMuted">No jobs in this lane</div>
              ) : grouped[stage].map((job) => (
                <div key={job.id} className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{job.orderNumber}</p>
                      <p className="mt-1 text-xs text-textMuted">{job.product}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${riskTone(job.slaRisk)}`}>{job.slaRisk} risk</span>
                  </div>

                  <div className="space-y-2 text-xs text-textMuted">
                    <div className="flex items-center gap-2"><Factory size={14} /> <span>{job.plant}</span></div>
                    <div className="flex items-center gap-2"><CalendarClock size={14} /> <span>{dueLabel(job.dueDate)}</span></div>
                    <div className="flex items-center gap-2"><PackageCheck size={14} /> <span>{stageLabels[job.stage]}</span></div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => setEditing(job)}>Edit</Button>
                    <Button onClick={() => moveJob(job, 'left')} disabled={job.stage === 'queued'}>Back</Button>
                    <PrimaryButton onClick={() => moveJob(job, 'right')} disabled={job.stage === 'shipped'}>
                      <span className="inline-flex items-center gap-1">Advance <ArrowRight size={14} /></span>
                    </PrimaryButton>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <h3 className="text-base font-semibold text-white">Board Guidance</h3>
          <ul className="mt-3 space-y-2 text-sm text-textMuted">
            <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">Keep high-risk jobs moving by checking proofing and print lanes twice a day.</li>
            <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">Use plant filtering during shift handover so each location sees only its active queue.</li>
            <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">This board is designed to become your API-connected job orchestration view later.</li>
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
            <div className="flex items-center gap-2 text-sm text-white"><Truck size={16} /> Jobs ready to ship</div>
            <p className="mt-3 text-4xl font-semibold text-white">{grouped.shipped.length}</p>
            <p className="mt-2 text-sm text-textMuted">Use this count to coordinate dispatch windows and customer updates.</p>
            {stats.highRisk > 0 ? (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                <span className="inline-flex items-center gap-2"><AlertTriangle size={14} /> {stats.highRisk} jobs still carry high SLA risk.</span>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.orderNumber}` : 'Edit job'}>
        {editing ? (
          <div className="space-y-3">
            <Input value={editing.orderNumber} onChange={(e) => setEditing({ ...editing, orderNumber: e.target.value })} placeholder="Order Number" />
            <Input value={editing.product} onChange={(e) => setEditing({ ...editing, product: e.target.value })} placeholder="Product" />
            <Select value={editing.plant} options={['Nevada DC', 'Texas Plant', 'New Jersey Hub']} onChange={(e) => setEditing({ ...editing, plant: e.target.value })} />
            <Select value={editing.stage} options={stageOrder} onChange={(e) => setEditing({ ...editing, stage: e.target.value as ProductionJob['stage'] })} />
            <Select value={editing.slaRisk} options={['low', 'medium', 'high']} onChange={(e) => setEditing({ ...editing, slaRisk: e.target.value as ProductionJob['slaRisk'] })} />
            <Input type="date" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} />
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
