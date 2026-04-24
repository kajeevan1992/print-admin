'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type ArtworkQueueRow = {
  id: string;
  orderReference: string;
  customerEmail: string;
  fileName: string;
  fileType: string;
  status: string;
};

const fallbackRows: ArtworkQueueRow[] = [
  {
    id: 'artwork-demo-1',
    orderReference: 'ORD-1001',
    customerEmail: 'ava@example.com',
    fileName: 'business-cards-proof.pdf',
    fileType: 'PDF',
    status: 'pending-review',
  },
  {
    id: 'artwork-demo-2',
    orderReference: 'ORD-1002',
    customerEmail: 'leo@example.com',
    fileName: 'mailer-box-artwork.ai',
    fileType: 'AI',
    status: 'awaiting-customer-fix',
  },
];

function normalizeRows(payload: any): ArtworkQueueRow[] {
  const raw = payload?.data?.items || payload?.data || payload?.payload?.data || payload?.payload || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((entry: any, index: number) => ({
    id: entry.id || `artwork-${index + 1}`,
    orderReference: entry.orderReference || entry.order?.orderNumber || entry.orderId || 'Not linked',
    customerEmail: entry.customerEmail || entry.email || entry.order?.email || 'Not available',
    fileName: entry.fileName || 'Artwork file',
    fileType: entry.fileType || 'Unknown',
    status: entry.status || 'pending-review',
  }));
}

function nextArtworkStatus(status: string) {
  if (status === 'pending-review') return 'approved';
  if (status === 'awaiting-customer-fix') return 'pending-review';
  return 'approved';
}

export function AdminArtworkQueueBoard() {
  const [rows, setRows] = useState<ArtworkQueueRow[]>(fallbackRows);
  const [message, setMessage] = useState('Connecting to live artwork queue...');
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'live' | 'fallback'>('fallback');
  const [filter, setFilter] = useState('all');
  const [actionMessage, setActionMessage] = useState('');
  const [pendingArtworkId, setPendingArtworkId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/internal/artwork?tenantId=platform-demo', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        setRows(fallbackRows);
        setSource('fallback');
        setMessage('Internal artwork endpoint is not available yet. Showing fallback queue rows.');
        return;
      }

      const normalized = normalizeRows(payload);
      setRows(normalized.length ? normalized : fallbackRows);
      setSource(normalized.length ? 'live' : 'fallback');
      setMessage(
        normalized.length
          ? 'Connected to live artwork queue.'
          : 'Artwork endpoint returned no rows. Showing fallback queue rows.'
      );
    } catch {
      setRows(fallbackRows);
      setSource('fallback');
      setMessage('Could not reach the internal artwork endpoint. Showing fallback queue rows.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  async function handleAdvanceArtwork(artworkId: string, currentStatus: string) {
    if (pendingArtworkId) return;
    const target = nextArtworkStatus(currentStatus);
    const previousRows = rows;
    setRows((current) => current.map((row) => row.id === artworkId ? { ...row, status: target } : row));
    setPendingArtworkId(artworkId);
    setActionMessage(`Attempting to change artwork ${artworkId} to ${target}...`);

    try {
      const res = await fetch('/api/internal/artwork/status', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ artworkId, status: target }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        setRows(previousRows);
        setActionMessage('Artwork status endpoint failed. Reverted optimistic change.');
        return;
      }

      await loadQueue();
      setActionMessage(`Artwork ${artworkId} updated to ${target} and reloaded from API.`);
    } catch {
      setRows(previousRows);
      setActionMessage('Could not reach the artwork status endpoint. Reverted optimistic change.');
    } finally {
      setPendingArtworkId(null);
    }
  }

  const filtered = useMemo(
    () => rows.filter((row) => filter === 'all' || row.status === filter),
    [rows, filter]
  );

  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Artwork queue</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Review artwork handoff records linked to submitted orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
          >
            Source: {source === 'live' ? 'Live API' : 'Fallback'}
          </span>
          <button
            type="button"
            className="rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            onClick={() => {
              setLoading(true);
              setActionMessage('');
              loadQueue();
            }}
          >
            Refresh
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-2xl border px-4 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
          >
            <option value="all">All artwork</option>
            <option value="pending-review">Pending review</option>
            <option value="awaiting-customer-fix">Awaiting customer fix</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      <div
        className="mt-4 rounded-2xl border px-4 py-3 text-sm"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
      >
        {loading ? 'Loading artwork queue...' : message}
      </div>

      {actionMessage ? (
        <div
          className="mt-3 rounded-2xl border px-4 py-3 text-sm"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
        >
          {actionMessage}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {filtered.map((row) => (
          <div
            key={row.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{row.fileName}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {row.orderReference} · {row.customerEmail}
                </p>
              </div>
              <span
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
              >
                {row.status}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>File type</p>
                <p className="font-medium">{row.fileType}</p>
              </div>
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Next action</p>
                <p className="font-medium">
                  {row.status === 'approved'
                    ? 'Move forward to production'
                    : row.status === 'awaiting-customer-fix'
                    ? 'Request updated artwork'
                    : 'Review artwork'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
              >
                Open artwork
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                disabled={pendingArtworkId === row.id}
                onClick={() => handleAdvanceArtwork(row.id, row.status)}
              >
                {pendingArtworkId === row.id ? 'Updating...' : row.status === 'approved' ? 'Keep approved' : 'Advance artwork'}
              </button>
            </div>
          </div>
        ))}

        {!filtered.length ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
          >
            No artwork records match the selected filter.
          </div>
        ) : null}
      </div>
    </div>
  );
}
