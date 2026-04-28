'use client';

import { useEffect, useMemo, useState } from 'react';

type Status = 'pass' | 'warning' | 'fail';

type Check = {
  id: string;
  group: string;
  label: string;
  status: Status;
  detail: string;
  nextAction: string;
};

type ManualTest = {
  id: string;
  label: string;
  href: string;
};

const badgeClass: Record<Status, string> = {
  pass: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  warning: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  fail: 'border-rose-400/20 bg-rose-400/10 text-rose-100'
};

export default function LiveReadinessPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState('all');

  useEffect(() => {
    let active = true;
    fetch('/api/internal/platform/live-readiness')
      .then((response) => response.json())
      .then((json) => {
        if (active) setData(json.data ?? json);
      })
      .catch((error) => {
        if (active) setData({ error: error instanceof Error ? error.message : 'Failed to load readiness data' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const checks: Check[] = data?.checks ?? [];
  const groups = useMemo(() => ['all', ...Array.from(new Set(checks.map((check) => check.group)))], [checks]);
  const filteredChecks = groupFilter === 'all' ? checks : checks.filter((check) => check.group === groupFilter);
  const manualTests: ManualTest[] = data?.requiredManualTests ?? [];
  const summary = data?.summary ?? { total: 0, pass: 0, warning: 0, fail: 0 };

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Live test readiness</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Live Readiness Pack</h1>
            <p className="mt-2 max-w-3xl text-sm text-textMuted">
              Final pre-live checklist for environment, navigation, API boundaries, seed data, pricing, and minimum customer flow.
            </p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-sm ${summary.fail > 0 ? badgeClass.fail : summary.warning > 0 ? badgeClass.warning : badgeClass.pass}`}>
            {loading ? 'Loading readiness…' : data?.recommendation ?? 'Readiness loaded'}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['Total checks', summary.total],
          ['Passed', summary.pass],
          ['Warnings', summary.warning],
          ['Failed', summary.fail]
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-white/8 bg-panel/80 p-4">
            <p className="text-xs text-textMuted">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[24px] border border-white/8 bg-panel/80 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Readiness checks</h2>
            <p className="mt-1 text-sm text-textMuted">Resolve failures before live testing. Warnings are acceptable only for internal rehearsal.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setGroupFilter(group)}
                className={`rounded-xl border px-3 py-2 text-xs ${groupFilter === group ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-panelMuted text-textMuted hover:border-white/20'}`}
              >
                {group === 'all' ? 'All' : group}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {filteredChecks.map((check) => (
            <div key={check.id} className="rounded-2xl border border-white/8 bg-panelMuted p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-textMuted">{check.group}</span>
                    <span className={`rounded-full border px-2 py-1 text-xs ${badgeClass[check.status]}`}>{check.status}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-white">{check.label}</h3>
                  <p className="mt-2 text-sm text-textMuted">{check.detail}</p>
                </div>
                <div className="max-w-md rounded-xl border border-white/8 bg-panel/70 p-3 text-sm text-textMuted">
                  <span className="font-medium text-white">Next:</span> {check.nextAction}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/8 bg-panel/80 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Manual live-test rehearsal</h2>
            <p className="mt-1 text-sm text-textMuted">Run this list in order after deploying v240.</p>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(manualTests, null, 2))}
            className="rounded-xl border border-white/10 bg-panelMuted px-3 py-2 text-sm text-white hover:border-white/20"
          >
            Copy checklist JSON
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {manualTests.map((test, index) => (
            <a key={test.id} href={test.href} className="rounded-2xl border border-white/8 bg-panelMuted p-4 hover:border-white/20">
              <p className="text-xs text-textMuted">Step {index + 1}</p>
              <p className="mt-2 text-sm font-semibold text-white">{test.label}</p>
              <p className="mt-2 text-xs text-textMuted">{test.href}</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
