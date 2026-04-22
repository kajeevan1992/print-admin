'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Row = Record<string, any>;

type Props = {
  title: string;
  description: string;
  endpoint: string;
  fallbackRows: Row[];
  columns: { key: string; label: string }[];
};

function normalizeRows(payload: any): Row[] {
  const raw = payload?.payload?.data || payload?.payload || [];
  return Array.isArray(raw) ? raw : [];
}

function renderValue(row: Row, key: string) {
  const value = row?.[key];
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function AdminLiveTableBoard({ title, description, endpoint, fallbackRows, columns }: Props) {
  const [rows, setRows] = useState<Row[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(`Connecting to live ${title.toLowerCase()} API...`);
  const [source, setSource] = useState<'live' | 'fallback'>('fallback');
  const [query, setQuery] = useState('');

  const loadRows = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        setRows(fallbackRows);
        setSource('fallback');
        setMessage(`Live ${title.toLowerCase()} endpoint is not available yet. Showing fallback rows.`);
        return;
      }

      const normalized = normalizeRows(payload);
      setRows(normalized.length ? normalized : fallbackRows);
      setSource(normalized.length ? 'live' : 'fallback');
      setMessage(
        normalized.length
          ? `Connected to live ${title.toLowerCase()} data.`
          : `${title} endpoint returned no rows. Showing fallback rows.`
      );
    } catch {
      setRows(fallbackRows);
      setSource('fallback');
      setMessage(`Could not reach the ${title.toLowerCase()} endpoint. Showing fallback rows.`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, fallbackRows, title]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => columns.some((c) => String(row?.[c.key] ?? '').toLowerCase().includes(q)));
  }, [rows, query, columns]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {description}
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
              loadRows();
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
        />
        <div className="mt-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
          {loading ? `Loading ${title.toLowerCase()}...` : message}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="grid gap-3 border-b px-4 py-3 text-xs font-medium uppercase tracking-[0.16em]" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)', gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {columns.map((column) => (
              <div key={column.key}>{column.label}</div>
            ))}
          </div>

          {filtered.map((row, idx) => (
            <div
              key={row.id || row.slug || idx}
              className="grid gap-3 border-b px-4 py-3 text-sm last:border-b-0"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
            >
              {columns.map((column) => (
                <div key={column.key} className="truncate">{renderValue(row, column.key)}</div>
              ))}
            </div>
          ))}

          {!filtered.length ? (
            <div className="px-4 py-6 text-sm" style={{ color: 'var(--theme-text-muted)', background: 'var(--theme-surface-alt)' }}>
              No records match the current search.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
