'use client';

import { useEffect, useState } from 'react';

type AdminOrderDetailPanelProps = {
  orderId: string | null;
};

export function AdminOrderDetailPanel({ orderId }: AdminOrderDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Select an order to inspect detail.');
  const [detail, setDetail] = useState<any>(null);
  const [source, setSource] = useState<'live' | 'fallback'>('fallback');
  const [lookupId, setLookupId] = useState(orderId || 'ORD-1001');

  async function loadDetail(targetId: string) {
    if (!targetId) {
      setDetail(null);
      setSource('fallback');
      setMessage('Select an order to inspect detail.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/admin-orders/${encodeURIComponent(targetId)}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        setDetail({
          id: targetId,
          orderNumber: targetId,
          customerName: 'Not available from API yet',
          status: 'Unknown',
          items: [],
          artworks: [],
          notes: 'Order detail endpoint is not available yet.',
        });
        setSource('fallback');
        setMessage('Showing fallback order detail because the live detail endpoint is not available yet.');
        return;
      }

      const raw = payload?.payload?.data || payload?.payload || null;
      setDetail(raw);
      setSource('live');
      setMessage('Connected to live order detail.');
    } catch {
      setDetail({
        id: targetId,
        orderNumber: targetId,
        customerName: 'Not available from API yet',
        status: 'Unknown',
        items: [],
        artworks: [],
        notes: 'Order detail endpoint could not be reached.',
      });
      setSource('fallback');
      setMessage('Showing fallback order detail because the live detail endpoint could not be reached.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLookupId(orderId || 'ORD-1001');
    loadDetail(orderId || 'ORD-1001');
  }, [orderId]);

  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Order detail</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Read-only order detail view for workflow verification.
          </p>
        </div>
        <span
          className="rounded-full border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
        >
          Source: {source === 'live' ? 'Live API' : 'Fallback'}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          className="h-10 flex-1 rounded-2xl border px-4 text-sm outline-none"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
          placeholder="Enter order reference"
        />
        <button
          type="button"
          className="rounded-full border px-3 py-2 text-xs"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
          onClick={() => loadDetail(lookupId)}
        >
          Load
        </button>
      </div>

      <div
        className="mt-4 rounded-2xl border px-4 py-3 text-sm"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
      >
        {loading ? 'Loading order detail...' : message}
      </div>

      {detail ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>
                Order reference
              </p>
              <p className="mt-2 text-sm font-medium">{detail.orderNumber || detail.id || lookupId}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>
                Customer
              </p>
              <p className="mt-2 text-sm font-medium">{detail.customerName || detail.customer?.name || detail.email || 'Not available'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>
                Status
              </p>
              <p className="mt-2 text-sm font-medium">{detail.status || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>
                Submitted
              </p>
              <p className="mt-2 text-sm font-medium">{detail.submittedAt || detail.createdAt || 'Not available'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>
              Items
            </p>
            <div className="mt-2 space-y-2">
              {Array.isArray(detail.items) && detail.items.length ? detail.items.map((item: any, index: number) => (
                <div
                  key={item.id || index}
                  className="rounded-2xl border px-4 py-3 text-sm"
                  style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
                >
                  <p className="font-medium">{item.name || item.productName || item.titleSnapshot || 'Order item'}</p>
                  <p className="mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                    Qty {item.quantity || item.qty || 1}
                  </p>
                </div>
              )) : (
                <div
                  className="rounded-2xl border px-4 py-3 text-sm"
                  style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
                >
                  No line items returned yet.
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>
              Artwork
            </p>
            <div className="mt-2 space-y-2">
              {Array.isArray(detail.artworks) && detail.artworks.length ? detail.artworks.map((artwork: any, index: number) => (
                <div
                  key={artwork.id || index}
                  className="rounded-2xl border px-4 py-3 text-sm"
                  style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
                >
                  <p className="font-medium">{artwork.fileName || 'Artwork file'}</p>
                  <p className="mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                    {artwork.status || 'Unknown'} · {artwork.fileType || 'Unknown'}
                  </p>
                </div>
              )) : (
                <div
                  className="rounded-2xl border px-4 py-3 text-sm"
                  style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
                >
                  No artwork records returned yet.
                </div>
              )}
            </div>
          </div>

          {detail.notes ? (
            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
            >
              {detail.notes}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
