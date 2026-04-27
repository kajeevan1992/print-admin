'use client';

import { useEffect, useMemo, useState } from 'react';

type PageAuditItem = {
  label: string;
  href: string;
  pageFile: string;
  inRegistry: boolean;
  registeredSurfaces: string[];
  apiRoutes: string[];
  status: 'connected' | 'partial' | 'placeholder' | 'unknown';
  repairBucket?: 'ready' | 'missing-navigation' | 'needs-db-api' | 'placeholder-cleanup' | 'manual-review';
  priorityScore?: number;
  evidence: string[];
  nextAction: string;
};

type RepairGroup = {
  key: string;
  label: string;
  description: string;
  count: number;
  pages: PageAuditItem[];
};

type SmokeTestStep = {
  id: string;
  area: string;
  label: string;
  href: string;
  method: 'manual' | 'api';
  expected: string;
  priority: 'critical' | 'high' | 'medium';
};

const statusClass: Record<PageAuditItem['status'], string> = {
  connected: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  partial: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  placeholder: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
  unknown: 'border-white/10 bg-white/5 text-textMuted'
};

const bucketClass: Record<string, string> = {
  ready: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  'missing-navigation': 'border-sky-400/20 bg-sky-400/10 text-sky-100',
  'needs-db-api': 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  'placeholder-cleanup': 'border-rose-400/20 bg-rose-400/10 text-rose-100',
  'manual-review': 'border-white/10 bg-white/5 text-textMuted'
};

function bucketLabel(bucket?: string) {
  switch (bucket) {
    case 'ready': return 'Ready';
    case 'missing-navigation': return 'Missing nav';
    case 'needs-db-api': return 'Needs DB/API';
    case 'placeholder-cleanup': return 'Placeholder';
    case 'manual-review': return 'Manual review';
    default: return 'Manual review';
  }
}

export default function SystemQaAuditPage() {
  const [data, setData] = useState<any>(null);
  const [smokeTests, setSmokeTests] = useState<SmokeTestStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [bucketFilter, setBucketFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/internal/platform/system-qa-audit')
      .then((res) => res.json())
      .then((json) => {
        if (active) setData(json.data ?? json);
      })
      .catch((error) => {
        if (active) setData({ error: error instanceof Error ? error.message : 'Failed to load system QA audit' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    fetch('/api/internal/platform/system-qa-smoke-tests')
      .then((response) => response.json())
      .then((json) => {
        if (active) setSmokeTests(json?.data?.tests ?? []);
      })
      .catch(() => {
        if (active) setSmokeTests([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const pages: PageAuditItem[] = data?.pages ?? [];
  const repairGroups: RepairGroup[] = data?.repairGroups ?? [];

  const filtered = useMemo(() => {
    return pages.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter || (statusFilter === 'missing-nav' && !item.inRegistry);
      const matchesBucket = bucketFilter === 'all' || item.repairBucket === bucketFilter;
      const haystack = `${item.label} ${item.href} ${item.pageFile} ${item.nextAction} ${item.repairBucket ?? ''}`.toLowerCase();
      return matchesStatus && matchesBucket && haystack.includes(query.toLowerCase());
    });
  }, [pages, query, statusFilter, bucketFilter]);

  const summary = data?.summary ?? {};

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Platform QA</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">System QA Audit Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-textMuted">
              Actionable repair tracker for pages, sidebar registration, internal API evidence, DB/API readiness, and the next fix queue.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-panelMuted px-4 py-3 text-sm text-textMuted">
            {loading ? 'Loading audit…' : `Audit loaded • ${summary.repairQueue ?? 0} repair items`}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        {[
          ['Pages', summary.pages],
          ['API routes', summary.apiRoutes],
          ['Nav items', summary.registeredNavigationItems],
          ['Connected', summary.connected],
          ['Partial', summary.partial],
          ['Placeholder', summary.placeholder],
          ['Missing nav', summary.notInRegistry],
          ['Repair queue', summary.repairQueue]
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-white/8 bg-panel/80 p-4">
            <p className="text-xs text-textMuted">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[24px] border border-white/8 bg-panel/80 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Repair tracker</h2>
            <p className="mt-1 text-sm text-textMuted">Use this section to decide the next build order instead of guessing.</p>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(data?.repairQueue ?? [], null, 2))}
            className="rounded-xl border border-white/10 bg-panelMuted px-3 py-2 text-sm text-white hover:border-white/20"
          >
            Copy repair queue JSON
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {repairGroups.map((group) => (
            <button
              type="button"
              key={group.key}
              onClick={() => setBucketFilter(group.key === bucketFilter ? 'all' : group.key)}
              className={`rounded-2xl border p-4 text-left transition ${bucketFilter === group.key ? bucketClass[group.key] : 'border-white/8 bg-panelMuted text-textMuted hover:border-white/20'}`}
            >
              <p className="text-sm font-semibold text-white">{group.label}</p>
              <p className="mt-2 text-2xl font-semibold">{group.count}</p>
              <p className="mt-2 text-xs leading-5">{group.description}</p>
            </button>
          ))}
        </div>
      </section>

      {data?.nextBuildRecommendation?.length ? (
        <section className="rounded-[24px] border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">
          <h2 className="font-semibold text-white">Recommended next repair build</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {data.nextBuildRecommendation.map((item: PageAuditItem) => (
              <li key={item.href}>
                <span className="font-medium">{item.label}</span> — {item.nextAction}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {data?.navValidation?.errors?.length ? (
        <section className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          <p className="font-semibold">Navigation registry errors</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {data.navValidation.errors.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : null}


      <section className="rounded-[24px] border border-white/8 bg-panel/80 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Post-deploy smoke test checklist</h2>
            <p className="mt-1 text-sm text-textMuted">Run these checks after each deploy before starting the next build.</p>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(smokeTests, null, 2))}
            className="rounded-xl border border-white/10 bg-panelMuted px-3 py-2 text-sm text-white hover:border-white/20"
          >
            Copy smoke tests JSON
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {smokeTests.map((test) => (
            <div key={test.id} className="rounded-2xl border border-white/8 bg-panelMuted p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-textMuted">{test.area}</p>
                  <a href={test.href} className="mt-1 block font-semibold text-white hover:underline">{test.label}</a>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase text-textMuted">{test.priority}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-textMuted">Expected: {test.expected}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/8 bg-panel/80 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-white">Page readiness checklist</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search page, route, action…"
              className="rounded-xl border border-white/10 bg-panelMuted px-3 py-2 text-sm text-white outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-panelMuted px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">All status</option>
              <option value="connected">Connected</option>
              <option value="partial">Partial</option>
              <option value="placeholder">Placeholder</option>
              <option value="unknown">Unknown</option>
              <option value="missing-nav">Missing nav</option>
            </select>
            <select
              value={bucketFilter}
              onChange={(event) => setBucketFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-panelMuted px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">All repair buckets</option>
              <option value="ready">Ready</option>
              <option value="missing-navigation">Missing navigation</option>
              <option value="needs-db-api">Needs DB/API</option>
              <option value="placeholder-cleanup">Placeholder cleanup</option>
              <option value="manual-review">Manual review</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-textMuted">
              <tr>
                <th className="px-3 py-2">Page</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Repair bucket</th>
                <th className="px-3 py-2">Sidebar/nav</th>
                <th className="px-3 py-2">API evidence</th>
                <th className="px-3 py-2">Next action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.pageFile} className="border-t border-white/6 align-top text-text">
                  <td className="px-3 py-3">
                    <a href={item.href} className="font-medium text-white hover:underline">{item.label}</a>
                    <p className="mt-1 text-xs text-textMuted">{item.href}</p>
                    <p className="mt-1 text-[11px] text-textMuted">{item.pageFile}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${statusClass[item.status]}`}>{item.status}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${bucketClass[item.repairBucket ?? 'manual-review']}`}>{bucketLabel(item.repairBucket)}</span>
                    {typeof item.priorityScore === 'number' ? <p className="mt-2 text-[11px] text-textMuted">Priority {item.priorityScore}</p> : null}
                  </td>
                  <td className="px-3 py-3">
                    {item.inRegistry ? (
                      <span className="text-emerald-200">Registered {item.registeredSurfaces.length ? `(${item.registeredSurfaces.join(', ')})` : ''}</span>
                    ) : (
                      <span className="text-amber-200">Not registered</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {item.apiRoutes.length ? (
                      <ul className="list-disc space-y-1 pl-4 text-xs text-textMuted">
                        {item.apiRoutes.slice(0, 4).map((route) => <li key={route}>{route}</li>)}
                      </ul>
                    ) : (
                      <span className="text-xs text-textMuted">No obvious matching route</span>
                    )}
                    {item.evidence.length ? <p className="mt-2 text-[11px] text-textMuted">{item.evidence.join(' • ')}</p> : null}
                  </td>
                  <td className="px-3 py-3 text-sm text-textMuted">{item.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
