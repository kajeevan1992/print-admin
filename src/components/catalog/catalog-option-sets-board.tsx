'use client';

import { useCallback, useEffect, useState } from 'react';

type OptionSummary = {
  optionSets: number;
};

const fallbackSummary: OptionSummary = {
  optionSets: 4,
};

export function CatalogOptionSetsBoard() {
  const [summary, setSummary] = useState<OptionSummary>(fallbackSummary);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Connecting to live option sets endpoint...');
  const [source, setSource] = useState<'live' | 'fallback'>('fallback');

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/catalog-option-sets', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        setSummary(fallbackSummary);
        setSource('fallback');
        setMessage('Option sets endpoint is not available yet. Showing fallback summary.');
        return;
      }

      const raw = payload?.payload?.data || payload?.payload || [];
      const count = Array.isArray(raw) ? raw.length : 0;
      setSummary({ optionSets: count || fallbackSummary.optionSets });
      setSource(count ? 'live' : 'fallback');
      setMessage(count ? 'Connected to live option sets data.' : 'Option sets endpoint returned no rows. Showing fallback summary.');
    } catch {
      setSummary(fallbackSummary);
      setSource('fallback');
      setMessage('Could not reach option sets endpoint. Showing fallback summary.');
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
          <p className="text-sm font-semibold">Option sets</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Live-first option-set wiring for configurable print products.
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
        {loading ? 'Loading option sets...' : message}
      </div>

      <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>Option sets</p>
        <p className="mt-3 text-2xl font-semibold">{summary.optionSets}</p>
      </div>
    </div>
  );
}
