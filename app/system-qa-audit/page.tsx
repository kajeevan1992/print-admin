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
  evidence: string[];
  nextAction: string;
};

const statusClass: Record<PageAuditItem['status'], string> = {
  connected: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  partial: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  placeholder: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
  unknown: 'border-white/10 bg-white/5 text-textMuted'
};

export default function SystemQaAuditPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
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

    return () => {
      active = false;
    };
  }, []);

  const pages: PageAuditItem[] = data?.pages ?? [];
  const filtered = useMemo(() => {
    return pages.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter || (statusFilter === 'missing-nav' && !item.inRegistry);
      const haystack = `${item.label} ${item.href} ${item.pageFile} ${item.nextAction}`.toLowerCase();
      return matchesStatus && haystack.includes(query.toLowerCase());
    });
  }, [pages, query, statusFilter]);

  const summary = data?.summary ?? {};

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Platform QA</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">System QA Audit Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-textMuted">
              One checkpoint for pages, sidebar registration, internal API evidence, DB/API readiness, and what needs fixing next.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-panelMuted px-4 py-3 text-sm text-textMuted">
            {loading ? 'Loading audit…' : 'Audit loaded from internal core'}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
        {[
          ['Pages', summary.pages],
          ['API routes', summary.apiRoutes],
          ['Nav items', summary.registeredNavigationItems],
          ['Connected', summary.connected],
          ['Partial', summary.partial],
          ['Placeholder', summary.placeholder],
          ['Missing nav', summary.notInRegistry]
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-white/8 bg-panel/80 p-4">
            <p className="text-xs text-textMuted">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value ?? 0}</p>
          </div>
        ))}
      </section>

      {data?.navValidation?.errors?.length ? (
        <section className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          <p className="font-semibold">Navigation registry errors</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {data.navValidation.errors.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : null}

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
              <option value="all">All</option>
              <option value="connected">Connected</option>
              <option value="partial">Partial</option>
              <option value="placeholder">Placeholder</option>
              <option value="unknown">Unknown</option>
              <option value="missing-nav">Missing nav</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-textMuted">
              <tr>
                <th className="px-3 py-2">Page</th>
                <th className="px-3 py-2">Status</th>
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
