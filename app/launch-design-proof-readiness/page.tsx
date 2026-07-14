'use client';

import { useEffect, useMemo, useState } from 'react';

type Check = Record<string, any> & { id: string; group: string; label: string; status: 'pass' | 'warn' | 'fail' | 'skip'; detail: string; action?: string; href?: string };
type Payload = Record<string, any> & { checks?: Check[]; summary?: Record<string, number>; launchStatus?: string; score?: number; nextActions?: Array<Record<string, any>> };

function tone(status: string) {
  if (status === 'pass') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  if (status === 'warn') return 'border-amber-300 bg-amber-50 text-amber-800';
  if (status === 'fail') return 'border-rose-300 bg-rose-50 text-rose-800';
  return 'border-slate-300 bg-slate-50 text-slate-700';
}

function statusLabel(status?: string) {
  if (status === 'ready') return 'Ready';
  if (status === 'blocked') return 'Blocked';
  if (status === 'review') return 'Needs review';
  return status || 'Checking';
}

export default function LaunchDesignProofReadinessPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/internal/launch/design-proof-readiness', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Could not load design proof readiness.');
      setData(payload);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load design proof readiness.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const groups = useMemo(() => {
    const rows = data?.checks || [];
    return rows.reduce<Record<string, Check[]>>((acc, check) => {
      const group = check.group || 'Other';
      acc[group] = [...(acc[group] || []), check];
      return acc;
    }, {});
  }, [data]);

  return <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950 lg:px-8">
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-sky-600">Launch operations</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Design proof launch readiness</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Checks customer design briefs, proof tokens, proof versions, proof events, pending approvals, design quote payment holds and proof email queue health.</p>
          </div>
          <button onClick={() => void load()} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Refresh</button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Status</p><p className="mt-1 text-2xl font-black">{statusLabel(data?.launchStatus)}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Score</p><p className="mt-1 text-2xl font-black">{data?.score ?? '—'}</p></div>
          {[['Pass', data?.summary?.pass || 0], ['Warn', data?.summary?.warn || 0], ['Fail', data?.summary?.fail || 0], ['Skip', data?.summary?.skip || 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}
        </div>
      </div>

      {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Checking design proof readiness…</div> : null}
      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800">{error}</div> : null}

      {data?.nextActions?.length ? <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Next launch actions</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{data.nextActions.map((action) => <a key={action.id} href={action.href || '#'} className="rounded-2xl border border-amber-200 bg-white p-4 text-sm no-underline"><p className="font-black text-amber-900">{action.label}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-600">{action.status}</p><p className="mt-2 text-xs text-slate-600">{action.action || 'Review this before launch.'}</p></a>)}</div>
      </div> : null}

      {Object.entries(groups).map(([group, checks]) => <section key={group} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black tracking-[-0.04em]">{group}</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{checks.map((check) => <div key={check.id} className={`rounded-2xl border p-4 ${tone(check.status)}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-black">{check.label}</p><p className="mt-1 text-sm opacity-90">{check.detail}</p></div><span className="rounded-full border border-current/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em]">{check.status}</span></div>
          {check.action ? <p className="mt-3 text-xs font-semibold opacity-90">Action: {check.action}</p> : null}
          {check.href ? <a href={check.href} className="mt-3 inline-flex rounded-full border border-current/20 bg-white/70 px-3 py-2 text-xs font-black no-underline">Open</a> : null}
        </div>)}</div>
      </section>)}
    </section>
  </main>;
}
