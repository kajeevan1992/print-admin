'use client';

import { useEffect, useMemo, useState } from 'react';

type RegistryItem = {
  label: string;
  href: string;
  groupLabel?: string;
  roles?: string[];
  surface?: string;
  description?: string;
  pageExists?: boolean;
};

export default function NavigationRegistryPage() {
  const [role, setRole] = useState('admin');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/internal/platform/navigation-registry?role=${role}`)
      .then((res) => res.json())
      .then((json) => {
        if (active) setData(json.data ?? json);
      })
      .catch((error) => {
        if (active) setData({ error: error instanceof Error ? error.message : 'Failed to load registry' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [role]);

  const items: RegistryItem[] = useMemo(() => data?.visible ?? [], [data]);
  const missingPages: RegistryItem[] = useMemo(() => data?.missingPages ?? [], [data]);
  const errors: string[] = data?.validation?.errors ?? [];
  const warnings: string[] = data?.validation?.warnings ?? [];

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">System navigation</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Navigation Registry</h1>
            <p className="mt-2 max-w-3xl text-sm text-textMuted">
              Checks that new admin tools and pages are registered for the sidebar/topbar and that the target page exists.
            </p>
          </div>
          <label className="grid gap-2 text-xs text-textMuted">
            Role view
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="rounded-xl border border-white/10 bg-panelMuted px-3 py-2 text-sm text-white outline-none"
            >
              <option value="admin">Admin</option>
              <option value="tenant_admin">Tenant Admin</option>
              <option value="owner">Owner</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-panel/80 p-4">
          <p className="text-xs text-textMuted">Registered</p>
          <p className="mt-2 text-2xl font-semibold text-white">{data?.totalRegistered ?? items.length}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-panel/80 p-4">
          <p className="text-xs text-textMuted">Visible for role</p>
          <p className="mt-2 text-2xl font-semibold text-white">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-panel/80 p-4">
          <p className="text-xs text-textMuted">Missing pages</p>
          <p className={"mt-2 text-2xl font-semibold " + (missingPages.length ? 'text-amber-300' : 'text-emerald-300')}>{missingPages.length}</p>
        </div>
      </section>

      {(errors.length || warnings.length || missingPages.length) ? (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm text-amber-100">
          <p className="font-semibold">Registry warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((item) => <li key={item}>{item}</li>)}
            {warnings.map((item) => <li key={item}>{item}</li>)}
            {missingPages.map((item) => <li key={item.href}>{item.label} points to {item.href}, but no app page/route was found.</li>)}
          </ul>
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4 text-sm text-emerald-100">
          Navigation registry is healthy for this role.
        </section>
      )}

      <section className="rounded-[24px] border border-white/8 bg-panel/80 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Visible registered pages</h2>
          {loading ? <span className="text-xs text-textMuted">Loading...</span> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-textMuted">
              <tr>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Href</th>
                <th className="px-3 py-2">Group</th>
                <th className="px-3 py-2">Surface</th>
                <th className="px-3 py-2">Page</th>
                <th className="px-3 py-2">Roles</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.href} className="border-t border-white/6 text-text">
                  <td className="px-3 py-3 font-medium text-white">{item.label}</td>
                  <td className="px-3 py-3">{item.href}</td>
                  <td className="px-3 py-3">{item.groupLabel ?? '—'}</td>
                  <td className="px-3 py-3">{item.surface ?? 'sidebar'}</td>
                  <td className="px-3 py-3">{item.pageExists ? 'Found' : 'Missing'}</td>
                  <td className="px-3 py-3">{item.roles?.join(', ') ?? 'all'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
