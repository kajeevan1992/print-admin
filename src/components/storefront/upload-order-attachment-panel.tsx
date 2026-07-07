'use client';

import { useEffect, useState } from 'react';

type OrderStatus = Record<string, any>;

function value(input: unknown, fallback = 'Not available') {
  const text = String(input || '').trim();
  return text || fallback;
}

export function UploadOrderAttachmentPanel() {
  const [orderId, setOrderId] = useState('');
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(id = orderId) {
    setLoading(true);
    setError('');
    try {
      if (!id) {
        setStatus(null);
        return;
      }
      const params = new URLSearchParams({ orderId: id });
      const response = await fetch(`/api/native-storefront/order-status?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Could not load order status.');
      setStatus(payload.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load order status.');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId') || params.get('orderNumber') || '';
    setOrderId(id);
    void load(id);
  }, []);

  const artwork = status?.artwork || {};
  const production = status?.production || {};

  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Artwork workflow attachment</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {orderId ? `Live order link: ${orderId}` : 'Add an orderId in the URL to show live attachment state.'}
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-3 text-xs text-rose-100">{error}</div> : null}

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--theme-primary)', background: 'var(--theme-surface-alt)' }}>
          <p className="font-medium">Order attachment</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {status?.order?.orderNumber ? `Artwork is attached to ${status.order.orderNumber}.` : 'Waiting for an order number to attach artwork.'}
          </p>
        </div>
        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
          <p className="font-medium">Proof status</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Artwork: {value(artwork.artworkStatus, 'pending')} · Preflight: {value(artwork.preflightStatus, 'pending')} · Proof: {value(artwork.customerProofStatus, 'pending')}
          </p>
        </div>
        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
          <p className="font-medium">Production gate</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {production.blockReason || `Stage: ${value(production.stage, 'not scheduled')}. Production remains controlled by proof approval.`}
          </p>
        </div>
      </div>
    </div>
  );
}
