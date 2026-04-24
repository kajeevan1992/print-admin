'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, Info } from 'lucide-react';

type PlatformStatusResponse = {
  ok?: boolean;
  platform?: {
    tenantDb?: {
      ok?: boolean;
      message?: string;
      tenantId?: string;
      connectionId?: string;
    };
  };
  error?: string;
};

type DiagnosticsProps = {
  resourceLabel: string;
  loading: boolean;
  error: string | null;
  itemCount: number;
};

export function CatalogPageDiagnostics({ resourceLabel, loading, error, itemCount }: DiagnosticsProps) {
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [dbMessage, setDbMessage] = useState('Checking database connection...');

  useEffect(() => {
    let cancelled = false;
    async function checkDb() {
      try {
        const response = await fetch('/api/internal/platform/status', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as PlatformStatusResponse;
        const tenantDb = payload.platform?.tenantDb;
        if (cancelled) return;
        setDbOk(Boolean(response.ok && payload.ok !== false && tenantDb?.ok));
        setDbMessage(tenantDb?.message || payload.error || (response.ok ? 'Database status returned without details' : `Status check failed (${response.status})`));
      } catch (err) {
        if (cancelled) return;
        setDbOk(false);
        setDbMessage(err instanceof Error ? err.message : 'Database status check failed');
      }
    }
    void checkDb();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{resourceLabel} could not load.</p>
            <p className="mt-1 text-red-100/85">{error}</p>
            <p className="mt-2 text-xs text-red-100/70">Database check: {dbMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-textMuted">
        <div className="flex items-center gap-3">
          <Database size={18} />
          <span>Loading {resourceLabel.toLowerCase()} and checking database status...</span>
        </div>
      </div>
    );
  }

  if (dbOk === false) {
    return (
      <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Database status needs attention.</p>
            <p className="mt-1 text-amber-100/85">{dbMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="mb-4 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Database is connected, but no {resourceLabel.toLowerCase()} were found.</p>
            <p className="mt-1 text-cyan-100/85">This usually means the tenant database is empty. Use the add button on this page to create the first record.</p>
            <p className="mt-2 text-xs text-cyan-100/70">Database check: {dbMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
      <div className="flex items-center gap-3">
        <CheckCircle2 size={18} />
        <span>Database connected · showing {itemCount} {resourceLabel.toLowerCase()}.</span>
      </div>
    </div>
  );
}
