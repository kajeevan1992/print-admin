'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, CalendarClock, CheckCircle2, Clock3, Factory, GitBranch, Layers3, Loader2, PauseCircle, PlayCircle, RefreshCcw, Route, Truck } from 'lucide-react';

type Job = Record<string, any>;
type PlannerData = { jobs: Job[]; lanes: any[]; capacity: any[]; timeline: any[]; batches: any[]; summary: Record<string, number> };

const stages = ['queued', 'prepress', 'print', 'finish', 'dispatch', 'completed', 'blocked'];
const labels: Record<string, string> = { queued: 'Queued', prepress: 'Prepress', print: 'Print', finish: 'Finish', dispatch: 'Dispatch', completed: 'Done', blocked: 'Blocked' };

function money(value: any, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value || 0) / 100);
}

function timeLabel(value: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: string }) {
  const map: Record<string, string> = {
    green: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    red: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
    blue: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
    slate: 'border-white/10 bg-white/[0.04] text-slate-300',
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${map[tone] || map.slate}`}>{children}</span>;
}

function StatCard({ icon: Icon, label, value, text }: any) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <div className="flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p><Icon size={17} className="text-sky-200" /></div>
    <p className="mt-2 text-2xl font-black text-white">{value}</p>
    {text ? <p className="mt-1 text-xs text-slate-400">{text}</p> : null}
  </div>;
}

function JobCard({ job, busy, onAction, onDragStart }: { job: Job; busy: boolean; onAction: (job: Job, action: string, extra?: any) => void; onDragStart: (job: Job) => void }) {
  const blocked = job.stage === 'blocked' || job.productionBlocked;
  return <article draggable onDragStart={() => onDragStart(job)} className="cursor-grab rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.20)] active:cursor-grabbing">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{job.orderNumber}</p><h3 className="mt-1 text-sm font-black text-white">{job.customerName || 'Customer'}</h3></div>
      <Pill tone={blocked ? 'red' : job.stage === 'completed' ? 'green' : 'blue'}>{labels[job.stage] || job.stage}</Pill>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-xl bg-white/[0.04] p-2"><p className="text-slate-500">Machine</p><p className="mt-1 font-bold text-white">{job.laneName}</p></div>
      <div className="rounded-xl bg-white/[0.04] p-2"><p className="text-slate-500">Time</p><p className="mt-1 font-bold text-white">{job.estimatedMinutes || 0} min</p></div>
      <div className="rounded-xl bg-white/[0.04] p-2"><p className="text-slate-500">SRA3</p><p className="mt-1 font-bold text-white">{job.sra3Sheets || 0} sheets</p></div>
      <div className="rounded-xl bg-white/[0.04] p-2"><p className="text-slate-500">Value</p><p className="mt-1 font-bold text-white">{money(job.grossTotalMinor, job.currency || 'GBP')}</p></div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2"><Pill tone={job.preflightStatus === 'pass' || job.preflightStatus === 'override' ? 'green' : 'amber'}>Preflight {job.preflightStatus || 'pending'}</Pill><Pill>{job.priority || 'standard'}</Pill></div>
    <div className="mt-4 flex flex-wrap gap-2">
      {job.stage !== 'completed' && !blocked ? <button disabled={busy} onClick={() => onAction(job, job.stage === 'queued' ? 'start' : 'advance')} className="rounded-xl bg-white px-3 py-2 text-[11px] font-black text-slate-950 disabled:opacity-50"><span className="inline-flex items-center gap-1"><PlayCircle size={13}/>{job.stage === 'queued' ? 'Start' : 'Next'}</span></button> : null}
      {blocked ? <button disabled={busy} onClick={() => onAction(job, 'resume')} className="rounded-xl border border-white/10 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50">Resume</button> : <button disabled={busy} onClick={() => onAction(job, 'hold')} className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-[11px] font-bold text-rose-100 disabled:opacity-50"><span className="inline-flex items-center gap-1"><PauseCircle size={13}/>Hold</span></button>}
      {job.stage !== 'completed' ? <button disabled={busy} onClick={() => onAction(job, 'complete')} className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-bold text-emerald-100 disabled:opacity-50"><span className="inline-flex items-center gap-1"><CheckCircle2 size={13}/>Done</span></button> : null}
    </div>
  </article>;
}

export default function ProductionPlannerPage() {
  const [data, setData] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [dragJob, setDragJob] = useState<Job | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setError(''); setLoading(true);
    try { const res = await fetch('/api/internal/catalog/production-planner', { cache: 'no-store' }); const json = await res.json(); if (!res.ok || json.ok === false) throw new Error(json?.error?.message || 'Planner failed'); setData(json.data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Planner failed'); }
    finally { setLoading(false); }
  }

  async function run(job: Job, action: string, extra: any = {}) {
    setBusy(job.id); setError('');
    try { const res = await fetch('/api/internal/catalog/production-planner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: job.id, action, ...extra }) }); const json = await res.json(); if (!res.ok || json.ok === false) throw new Error(json?.error?.message || 'Planner update failed'); setData(json.data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Planner update failed'); }
    finally { setBusy(''); }
  }

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => stages.map(stage => ({ stage, jobs: (data?.jobs || []).filter(j => j.stage === stage) })), [data]);
  const totalMinutes = (data?.capacity || []).reduce((s, c) => s + Number(c.usedMinutes || 0), 0);
  const totalSheets = (data?.jobs || []).reduce((s, j) => s + Number(j.sra3Sheets || 0), 0);
  const suggestedBatches = (data?.batches || []).filter(b => b.suggested).length;

  function dropStage(stage: string) { if (dragJob) run(dragJob, 'move-stage', { stage }); setDragJob(null); }

  return <div className="space-y-6">
    <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-200">v316 Planner UI</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-white">Production planner board</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Drag cards between stages, monitor machine capacity, review timeline slots, and spot SRA3 batch opportunities.</p></div><button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950"><RefreshCcw size={16}/>Refresh</button></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Factory} label="Jobs" value={data?.summary?.total ?? 0} text="Live production cards"/><StatCard icon={Clock3} label="Scheduled" value={`${totalMinutes} min`} text="Across active lanes"/><StatCard icon={Layers3} label="SRA3 Sheets" value={totalSheets} text="Estimated print sheets"/><StatCard icon={Boxes} label="Batch Suggestions" value={suggestedBatches} text="Gang-print opportunities"/></div>
    </section>

    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {loading ? <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading planner…</div> : null}

    {!loading && data ? <>
      <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"><div className="mb-4 flex items-center gap-2 text-white"><Factory size={18}/><h2 className="text-lg font-black">Machine capacity</h2></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{(data.capacity || []).map(c => <div key={c.laneId} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><p className="text-sm font-black text-white">{c.laneName}</p><p className="mt-1 text-xs text-slate-500">{c.usedMinutes}/{c.capacityMinutes} min · {c.jobCount} jobs</p><div className="mt-3 h-2 rounded-full bg-white/10"><div className={`h-2 rounded-full ${c.utilisationPercent > 90 ? 'bg-rose-400' : c.utilisationPercent > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{width: `${Math.min(100, c.utilisationPercent)}%`}} /></div><p className="mt-2 text-xs font-bold text-slate-300">{c.utilisationPercent}% used</p></div>)}</div></section>

      <section className="grid gap-4 xl:grid-cols-7">{grouped.map(group => <div key={group.stage} onDragOver={e => e.preventDefault()} onDrop={() => dropStage(group.stage)} className="min-h-[360px] rounded-3xl border border-white/10 bg-white/[0.025] p-3"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black text-white">{labels[group.stage]}</h2><Pill>{group.jobs.length}</Pill></div><div className="space-y-3">{group.jobs.length ? group.jobs.map(job => <JobCard key={job.id} job={job} busy={busy === job.id} onAction={run} onDragStart={setDragJob}/>) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">Drop jobs here</div>}</div></div>)}</section>

      <section className="grid gap-4 xl:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"><div className="mb-4 flex items-center gap-2 text-white"><CalendarClock size={18}/><h2 className="text-lg font-black">Timeline schedule</h2></div><div className="space-y-3">{(data.timeline || []).map(slot => <div key={`${slot.jobId}-${slot.startAt}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-white">{slot.orderNumber}</p><p className="text-xs text-slate-500">{slot.laneName}</p></div><Pill tone="blue">{timeLabel(slot.startAt)}–{timeLabel(slot.endAt)}</Pill></div></div>)}</div></div><div className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"><div className="mb-4 flex items-center gap-2 text-white"><GitBranch size={18}/><h2 className="text-lg font-black">SRA3 batch suggestions</h2></div><div className="space-y-3">{(data.batches || []).map(batch => <div key={batch.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-white">{batch.label}</p><p className="mt-1 text-xs text-slate-500">{(batch.orderNumbers || []).join(', ')}</p></div><Pill tone={batch.suggested ? 'green' : 'slate'}>{batch.suggested ? 'Suggested' : 'Single'}</Pill></div></div>)}</div></div></section>
    </> : null}
  </div>;
}
