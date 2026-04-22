'use client';

import { useCallback, useEffect, useState } from 'react';

type TaxonomyCounts = {
  categories: number;
  collections: number;
  tags: number;
};

const fallbackCounts: TaxonomyCounts = {
  categories: 3,
  collections: 2,
  tags: 6,
};

async function readCount(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) return null;
  const raw = payload?.payload?.data || payload?.payload || [];
  return Array.isArray(raw) ? raw.length : 0;
}

export function CatalogTaxonomyBoard() {
  const [counts, setCounts] = useState<TaxonomyCounts>(fallbackCounts);
  const [message, setMessage] = useState('Connecting to live taxonomy endpoints...');
  const [source, setSource] = useState<'live' | 'fallback'>('fallback');
  const [loading, setLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    try {
      const [categories, collections, tags] = await Promise.all([
        readCount('/api/proxy/catalog-categories'),
        readCount('/api/proxy/catalog-collections'),
        readCount('/api/proxy/catalog-tags'),
      ]);

      if (categories == null || collections == null || tags == null) {
        setCounts(fallbackCounts);
        setSource('fallback');
        setMessage('One or more taxonomy endpoints are not available yet. Showing fallback counts.');
        return;
      }

      setCounts({ categories, collections, tags });
      setSource('live');
      setMessage('Connected to live taxonomy data.');
    } catch {
      setCounts(fallbackCounts);
      setSource('fallback');
      setMessage('Could not reach taxonomy endpoints. Showing fallback counts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Taxonomy</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Category, collection, and tag overview for the catalog system.
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
              loadCounts();
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
        {loading ? 'Loading taxonomy...' : message}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>Categories</p>
          <p className="mt-3 text-2xl font-semibold">{counts.categories}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>Collections</p>
          <p className="mt-3 text-2xl font-semibold">{counts.collections}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>Tags</p>
          <p className="mt-3 text-2xl font-semibold">{counts.tags}</p>
        </div>
      </div>
    </div>
  );
}
