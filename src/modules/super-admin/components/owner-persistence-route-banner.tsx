'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

const OWNER_PAGE_RESOURCES: Record<string, { label: string; resource: string; seedCount: number }> = {
  '/owner-backups': { label: 'Owner Backups', resource: 'owner-backups', seedCount: 3 },
  '/owner-domains': { label: 'Owner Domains', resource: 'owner-domains', seedCount: 3 },
  '/owner-incidents': { label: 'Owner Incidents', resource: 'owner-incidents', seedCount: 3 },
  '/owner-maintenance-windows': { label: 'Owner Maintenance Windows', resource: 'owner-maintenance-windows', seedCount: 3 },
  '/owner-usage-limits': { label: 'Owner Usage Limits', resource: 'owner-usage-limits', seedCount: 3 },
  '/owner-sso-config': { label: 'Owner SSO Config', resource: 'owner-sso-configs', seedCount: 3 },
  '/owner-compliance-center': { label: 'Owner Compliance Center', resource: 'owner-compliance-controls', seedCount: 3 },
  '/owner-webhooks': { label: 'Owner Webhooks', resource: 'owner-webhooks', seedCount: 3 },
  '/owner-notifications': { label: 'Owner Notifications', resource: 'owner-notifications', seedCount: 3 },
  '/owner-environments': { label: 'Owner Environments', resource: 'owner-environments', seedCount: 3 },
};

type Status = { count: number; loading: boolean; error: string | null };

export function OwnerPersistenceRouteBanner() {
  const pathname = usePathname() || '';
  const config = useMemo(() => OWNER_PAGE_RESOURCES[pathname] || null, [pathname]);
  const [status, setStatus] = useState<Status>({ count: 0, loading: false, error: null });

  useEffect(() => {
    const current = config;
    if (!current) return;
    let cancelled = false;
    async function load() {
      setStatus({ count: 0, loading: true, error: null });
      try {
        const response = await fetch(`/api/internal/platform/owner-control-records?resource=${encodeURIComponent(current.resource)}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) throw new Error(payload?.error?.message || 'Could not load owner persistence status.');
        const rows = Array.isArray(payload?.data?.items) ? payload.data.items : [];
        if (!cancelled) setStatus({ count: rows.length, loading: false, error: null });
      } catch (error) {
        if (!cancelled) setStatus({ count: 0, loading: false, error: error instanceof Error ? error.message : 'Could not load owner persistence status.' });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [config]);

  if (!config) return null;

  const hasSavedRows = status.count > 0;
  const title = status.loading ? 'Checking owner persistence state' : hasSavedRows ? 'Loaded saved database rows' : 'Showing seed preview rows';
  const description = status.error
    ? status.error
    : `${config.label} · Resource: ${config.resource} · Saved rows: ${status.count} · Seed rows: ${config.seedCount}`;

  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${hasSavedRows ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="mt-1 text-xs opacity-80">{description}</p>
      </div>
      {!hasSavedRows && !status.loading ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white">Use Reset Seed to persist</span> : null}
    </div>
  );
}
