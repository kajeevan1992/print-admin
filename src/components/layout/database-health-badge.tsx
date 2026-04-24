'use client';

import { useEffect, useState } from 'react';
import { Database, AlertTriangle, CheckCircle2 } from 'lucide-react';

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

export function DatabaseHealthBadge() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'issue'>('checking');
  const [message, setMessage] = useState('Checking database connection...');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch('/api/internal/platform/status', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as PlatformStatusResponse;
        const tenantDb = payload.platform?.tenantDb;

        if (cancelled) return;

        if (response.ok && payload.ok !== false && tenantDb?.ok) {
          setStatus('connected');
          setMessage(`Database live${tenantDb.tenantId ? ` · ${tenantDb.tenantId}` : ''}`);
          return;
        }

        setStatus('issue');
        setMessage(tenantDb?.message || payload.error || 'Database status check failed');
      } catch (error) {
        if (cancelled) return;
        setStatus('issue');
        setMessage(error instanceof Error ? error.message : 'Database status check failed');
      }
    }

    void check();
    const timer = window.setInterval(check, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const Icon = status === 'connected' ? CheckCircle2 : status === 'issue' ? AlertTriangle : Database;
  const tone = status === 'connected'
    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
    : status === 'issue'
      ? 'border-red-400/30 bg-red-500/10 text-red-100'
      : 'border-white/8 bg-white/[0.03] text-textMuted';

  return (
    <div title={message} className={`inline-flex max-w-[280px] items-center gap-2 truncate rounded-2xl border px-4 py-2.5 text-[12px] font-medium ${tone}`}>
      <Icon size={14} />
      <span className="truncate">{message}</span>
    </div>
  );
}
