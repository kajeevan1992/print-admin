'use client';

import { useCallback, useEffect, useState } from 'react';

type MaterialSummary = {
  materials: number;
  finishes: number;
};

const fallbackSummary: MaterialSummary = {
  materials: 5,
  finishes: 4,
};

async function readCount(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) return null;
  const raw = payload?.payload?.data || payload?.payload || [];
  return Array.isArray(raw) ? raw.length : 0;
}

export function CatalogMaterialsBoard() {
  const [summary, setSummary] = useState<MaterialSummary>(fallbackSummary);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Connecting to live material and finish endpoints...');
  const [source, setSource] = useState<'live' | 'fallback'>('fallback');

  const loadSummary = useCallback(async () => {
    try {
      const [materials, finishes] = await Promise.all([
        readCount('/api/proxy/catalog-materials'),
        readCount('/api/proxy/catalog-finishes'),
      ]);

      if (materials == null || finishes == null) {
        setSummary(fallbackSummary);
        setSource('fallback');
        setMessage('Materials or finishes endpoints are not available yet. Showing fallback summary.');
        return;
      }

      setSummary({ materials, finishes });
      setSource('live');
      setMessage('Connected to live materials and finishes data.');
    } catch {
      setSummary(fallbackSummary);
      setSource('fallback');
      setMessage('Could not reach materials or finishes endpoints. Showing fallback summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Materials & finishes</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Live-first material library overview for print production setup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>
            Source: {source === 'live' ? 'Live API' : 'Fallback'}
          </span>
          <button
            type="button"
            className="rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            onClick={() => {
              setLoading(true);
              loadSummary();
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
        {loading ? 'Loading materials and finishes...' : message}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>Materials</p>
          <p className="mt-3 text-2xl font-semibold">{summary.materials}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>Finishes</p>
          <p className="mt-3 text-2xl font-semibold">{summary.finishes}</p>
        </div>
      </div>
    </div>
  );
}
