'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Factory, Route, Search, ShieldAlert, TimerReset, WandSparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { productionPlannerService } from '@/services/production-planner.service';
import type { PlannerPriority, PlannerRecord, PlannerStatus } from '@/data/production-planner';

const priorityOptions: Array<'all' | PlannerPriority> = ['all', 'low', 'medium', 'high'];
const statusOptions: Array<'all' | PlannerStatus> = ['all', 'draft', 'ready', 'blocked', 'released'];

const emptyPlan: PlannerRecord = {
  id: '',
  jobNumber: '',
  customer: '',
  product: '',
  plant: 'London',
  machine: '',
  plannedDate: '',
  estimatedHours: 1,
  priority: 'medium',
  status: 'draft',
  route: '',
  owner: '',
  notes: ''
};

const priorityTone: Record<PlannerPriority, string> = {
  low: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  medium: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  high: 'border-rose-400/30 bg-rose-400/10 text-rose-200'
};

const statusTone: Record<PlannerStatus, string> = {
  draft: 'border-slate-400/30 bg-slate-400/10 text-slate-200',
  ready: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  blocked: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  released: 'border-violet-400/30 bg-violet-400/10 text-violet-200'
};

export function ProductionPlannerPage() {
  const [plans, setPlans] = useState<PlannerRecord[]>([]);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<'all' | PlannerPriority>('all');
  const [status, setStatus] = useState<'all' | PlannerStatus>('all');
  const [editing, setEditing] = useState<PlannerRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const items = await productionPlannerService.getPlans();
    setPlans(items);
    setSelectedId((current) => current ?? items[0]?.id ?? null);
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => plans.filter((plan) => {
    const haystack = `${plan.jobNumber} ${plan.customer} ${plan.product} ${plan.plant} ${plan.machine} ${plan.route}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesPriority = priority === 'all' || plan.priority === priority;
    const matchesStatus = status === 'all' || plan.status === status;
    return matchesSearch && matchesPriority && matchesStatus;
  }), [plans, search, priority, status]);

  const selected = rows.find((plan) => plan.id === selectedId) ?? rows[0] ?? null;

  const kpis = useMemo(() => ({
    total: rows.length,
    blocked: rows.filter((item) => item.status === 'blocked').length,
    ready: rows.filter((item) => item.status === 'ready').length,
    hours: rows.reduce((sum, item) => sum + item.estimatedHours, 0)
  }), [rows]);

  const plantLoad = useMemo(() => {
    const grouped = new Map<string, number>();
    rows.forEach((item) => grouped.set(item.plant, (grouped.get(item.plant) ?? 0) + item.estimatedHours));
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  async function savePlan(plan: PlannerRecord) {
    await productionPlannerService.savePlan(plan);
    setEditing(null);
    await load();
    setSelectedId(plan.id);
  }

  const createPlan = () => setEditing({ ...emptyPlan, id: `pp-${Date.now()}`, plannedDate: new Date().toISOString().slice(0, 10), jobNumber: `ORD-${Math.floor(Math.random() * 90000) + 10000}` });

  const duplicatePlan = async (plan: PlannerRecord) => {
    await savePlan({ ...plan, id: `pp-${Date.now()}`, jobNumber: `ORD-${Math.floor(Math.random() * 90000) + 10000}`, status: 'draft', product: `${plan.product} Copy` });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(plans, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'production-planner-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Production Planner"
        subtitle="Build and release production-ready schedules before jobs hit the live board. This is the planning surface that connects proofing, plant load, and machine choice."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={load}>Refresh</Button>
            <Button onClick={exportJson}>Export JSON</Button>
            <Button onClick={async () => { await productionPlannerService.resetPlans(); await load(); }}>Reset seed data</Button>
            <PrimaryButton onClick={createPlan}>Add Plan</PrimaryButton>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs text-textMuted">Plans in view</p><p className="mt-2 text-2xl font-semibold">{kpis.total}</p></Card>
        <Card><p className="text-xs text-textMuted">Blocked plans</p><p className="mt-2 text-2xl font-semibold">{kpis.blocked}</p></Card>
        <Card><p className="text-xs text-textMuted">Ready to release</p><p className="mt-2 text-2xl font-semibold">{kpis.ready}</p></Card>
        <Card><p className="text-xs text-textMuted">Planned hours</p><p className="mt-2 text-2xl font-semibold">{kpis.hours.toFixed(1)}h</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
              <Input className="pl-9" placeholder="Search order, customer, product, machine..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select options={priorityOptions} value={priority} onChange={(e) => setPriority(e.target.value as 'all' | PlannerPriority)} />
            <Select options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value as 'all' | PlannerStatus)} />
          </div>

          <div className="grid gap-3">
            {rows.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedId(plan.id)}
                className={`rounded-2xl border p-4 text-left transition ${selectedId === plan.id ? 'border-accent bg-accent/10' : 'border-white/6 bg-white/[0.02] hover:border-white/15'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{plan.jobNumber} · {plan.product}</p>
                    <p className="mt-1 text-xs text-textMuted">{plan.customer} · {plan.plant} · {plan.machine}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone[plan.status]}`}>{plan.status}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${priorityTone[plan.priority]}`}>{plan.priority}</span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-textMuted md:grid-cols-4">
                  <div><span className="text-white">Date:</span> {plan.plannedDate}</div>
                  <div><span className="text-white">Owner:</span> {plan.owner}</div>
                  <div><span className="text-white">Hours:</span> {plan.estimatedHours.toFixed(1)}h</div>
                  <div><span className="text-white">Route:</span> {plan.route.split('→')[0].trim()}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={(e) => { e.stopPropagation(); setEditing(plan); }}>Edit</Button>
                  <Button onClick={(e) => { e.stopPropagation(); duplicatePlan(plan); }}>Duplicate</Button>
                  <Button onClick={async (e) => { e.stopPropagation(); await productionPlannerService.deletePlan(plan.id); await load(); }}>Delete</Button>
                  {plan.status !== 'released' ? (
                    <PrimaryButton onClick={async (e) => { e.stopPropagation(); await savePlan({ ...plan, status: 'released' }); }}>
                      Release to board
                    </PrimaryButton>
                  ) : (
                    <Button onClick={async (e) => { e.stopPropagation(); await savePlan({ ...plan, status: 'ready' }); }}>
                      Re-open plan
                    </Button>
                  )}
                </div>
              </button>
            ))}

            {!rows.length ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-textMuted">No production plans match the current filters.</div> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Planner spotlight</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{selected?.jobNumber ?? 'No plan selected'}</h3>
              <p className="mt-1 text-sm text-textMuted">{selected ? `${selected.customer} · ${selected.product}` : 'Choose a plan to review route, capacity, and release readiness.'}</p>
            </div>
            {selected ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Plant / machine</p><p className="mt-1 text-sm font-semibold text-white">{selected.plant} · {selected.machine}</p></div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Planned date</p><p className="mt-1 text-sm font-semibold text-white">{selected.plannedDate}</p></div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Estimated effort</p><p className="mt-1 text-sm font-semibold text-white">{selected.estimatedHours.toFixed(1)}h</p></div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Owner</p><p className="mt-1 text-sm font-semibold text-white">{selected.owner}</p></div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-white"><Route size={16} /> Route</div>
                  <p className="mt-2 text-sm leading-6 text-textMuted">{selected.route}</p>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Planning notes</p>
                  <p className="mt-2 text-sm leading-6 text-textMuted">{selected.notes}</p>
                </div>
              </>
            ) : null}
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-white"><CalendarClock size={16} /> Plant capacity snapshot</div>
            <div className="mt-3 space-y-2 text-sm text-textMuted">
              {plantLoad.map(([plantName, hours]) => (
                <div key={plantName} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{plantName}</span>
                    <span>{hours.toFixed(1)}h</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Factory size={16} /> Machine choice</div><p className="mt-2 text-sm text-textMuted">Make machine assignment visible before jobs crowd the production board.</p></div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><ShieldAlert size={16} /> Risk control</div><p className="mt-2 text-sm text-textMuted">Blocked plans stand out early so teams solve supply || artwork issues sooner.</p></div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><WandSparkles size={16} /> Release flow</div><p className="mt-2 text-sm text-textMuted">A clean front-end release step prepares this page for later API-driven orchestration.</p></div>
            </div>
          </Card>
        </div>
      </div>

      <BaseModal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.jobNumber ? `Edit ${editing.jobNumber}` : 'Add production plan'}>
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Order number" value={editing.jobNumber} onChange={(e) => setEditing({ ...editing, jobNumber: e.target.value })} />
              <Input placeholder="Customer" value={editing.customer} onChange={(e) => setEditing({ ...editing, customer: e.target.value })} />
              <Input placeholder="Product" value={editing.product} onChange={(e) => setEditing({ ...editing, product: e.target.value })} />
              <Input placeholder="Plant" value={editing.plant} onChange={(e) => setEditing({ ...editing, plant: e.target.value })} />
              <Input placeholder="Machine" value={editing.machine} onChange={(e) => setEditing({ ...editing, machine: e.target.value })} />
              <Input placeholder="Planned date" type="date" value={editing.plannedDate} onChange={(e) => setEditing({ ...editing, plannedDate: e.target.value })} />
              <Input placeholder="Estimated hours" type="number" step="0.5" value={String(editing.estimatedHours)} onChange={(e) => setEditing({ ...editing, estimatedHours: Number(e.target.value) || 0 })} />
              <Input placeholder="Owner" value={editing.owner} onChange={(e) => setEditing({ ...editing, owner: e.target.value })} />
            </div>
            <Select options={['low', 'medium', 'high']} value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value as PlannerPriority })} />
            <Select options={['draft', 'ready', 'blocked', 'released']} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as PlannerStatus })} />
            <Input placeholder="Route" value={editing.route} onChange={(e) => setEditing({ ...editing, route: e.target.value })} />
            <textarea className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none" placeholder="Notes" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <PrimaryButton onClick={() => savePlan(editing)}>Save plan</PrimaryButton>
            </div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
