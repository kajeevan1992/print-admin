'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminOrderControlSeed } from '@/data/admin-order-control';
import { AdminOrderStatusBadge } from './admin-order-status-badge';
import { AdminPriorityBadge } from './admin-priority-badge';

type LiveAdminOrderRow = {
  id: string;
  customer: string;
  product: string;
  submittedAt: string;
  total: string;
  status: string;
  assignee: string;
  priority: 'standard' | 'rush';
};

function formatMoney(totalMinor?: number | null) {
  if (typeof totalMinor !== 'number') return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(totalMinor / 100);
}

function mapStatus(input?: string) {
  switch ((input || '').toLowerCase()) {
    case 'draft':
    case 'awaiting-artwork':
      return 'awaiting-artwork';
    case 'artwork-review':
      return 'artwork-review';
    case 'awaiting-approval':
      return 'awaiting-approval';
    case 'approved':
    case 'in-production':
      return 'in-production';
    case 'quality-check':
      return 'quality-check';
    case 'dispatched':
    case 'ready-to-dispatch':
      return 'ready-to-dispatch';
    default:
      return 'artwork-review';
  }
}

function nextStatus(status: string) {
  if (status === 'awaiting-artwork') return 'artwork-review';
  if (status === 'artwork-review') return 'awaiting-approval';
  if (status === 'awaiting-approval') return 'in-production';
  if (status === 'in-production') return 'quality-check';
  if (status === 'quality-check') return 'ready-to-dispatch';
  return 'ready-to-dispatch';
}

function normalizeRows(payload: any): LiveAdminOrderRow[] {
  const raw = payload?.data?.items || payload?.data || payload?.payload?.data || payload?.payload || [];
  if (!Array.isArray(raw)) return [];

  return raw.map((order: any, index: number) => ({
    id: order.orderNumber || order.id || `ORD-${index + 1}`,
    customer:
      order.customerName ||
      order.customer?.name ||
      order.customer?.email ||
      order.email ||
      'Customer',
    product:
      order.items?.[0]?.name ||
      order.items?.[0]?.titleSnapshot ||
      order.productName ||
      'Order item',
    submittedAt:
      order.submittedAt ||
      order.createdAt ||
      order.placedAt ||
      'Not available',
    total:
      typeof order.totalMinor === 'number'
        ? formatMoney(order.totalMinor)
        : typeof order.total === 'number'
        ? formatMoney(order.total)
        : '—',
    status: mapStatus(order.status),
    assignee: order.assignee || 'Ops Team',
    priority: order.priority === 'rush' ? 'rush' : 'standard',
  }));
}

export function AdminOrderControlBoard() {
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState<LiveAdminOrderRow[]>(adminOrderControlSeed);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Connecting to live orders API...');
  const [actionMessage, setActionMessage] = useState('');
  const [source, setSource] = useState<'live' | 'seed'>('seed');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders?tenantId=platform-demo', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        setRows(adminOrderControlSeed);
        setSource('seed');
        setMessage('Internal orders API is not available yet. Showing seeded workflow rows.');
        return;
      }

      const normalized = normalizeRows(payload);
      setRows(normalized.length ? normalized : adminOrderControlSeed);
      setSource(normalized.length ? 'live' : 'seed');
      setMessage(
        normalized.length
          ? 'Connected to live admin order data.'
          : 'Orders API connected but returned no rows. Showing seeded workflow rows.'
      );
    } catch {
      setRows(adminOrderControlSeed);
      setSource('seed');
      setMessage('Could not reach the internal orders API. Showing seeded workflow rows.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleAdvance(orderId: string, currentStatus: string) {
    if (pendingOrderId) return;
    const target = nextStatus(currentStatus);
    const previousRows = rows;
    setRows((current) =>
      current.map((row) => (row.id === orderId ? { ...row, status: target } : row))
    );
    setPendingOrderId(orderId);
    setActionMessage(`Attempting to change ${orderId} to ${target}...`);

    try {
      const res = await fetch('/api/internal/orders/status', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, status: target }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        setRows(previousRows);
        setActionMessage('Status endpoint failed. Reverted optimistic change.');
        return;
      }

      await loadOrders();
      setActionMessage(`Order ${orderId} updated to ${target} and reloaded from API.`);
    } catch {
      setRows(previousRows);
      setActionMessage('Could not reach the status endpoint. Reverted optimistic change.');
    } finally {
      setPendingOrderId(null);
    }
  }

  const filteredRows = useMemo(
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
          <p className="text-sm font-semibold">Admin order control board</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Review incoming jobs, artwork states, approvals, production, and dispatch readiness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
          >
            Source: {source === 'live' ? 'Live API' : 'Seeded fallback'}
          </span>
          <button
            type="button"
            className="rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            onClick={() => {
              setLoading(true);
              setActionMessage('');
              loadOrders();
            }}
          >
            Refresh
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-2xl border px-4 py-2 text-sm outline-none"
            style={{
              borderColor: 'var(--theme-border)',
              background: 'var(--theme-surface-alt)',
              color: 'var(--theme-text)',
            }}
          >
            <option value="all">All statuses</option>
            <option value="awaiting-artwork">Awaiting artwork</option>
            <option value="artwork-review">Artwork review</option>
            <option value="awaiting-approval">Awaiting approval</option>
            <option value="in-production">In production</option>
            <option value="quality-check">Quality check</option>
            <option value="ready-to-dispatch">Ready to dispatch</option>
          </select>
        </div>
      </div>

      <div
        className="mt-4 rounded-2xl border px-4 py-3 text-sm"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
      >
        {loading ? 'Loading admin orders...' : message}
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
        {filteredRows.map((row) => (
          <div
            key={row.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{row.product}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {row.id} · {row.customer} · {row.submittedAt}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminPriorityBadge priority={row.priority} />
                <AdminOrderStatusBadge status={row.status} />
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Total</p>
                <p className="font-medium">{row.total}</p>
              </div>
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Assignee</p>
                <p className="font-medium">{row.assignee}</p>
              </div>
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Next action</p>
                <p className="font-medium">
                  {row.status === 'artwork-review'
                    ? 'Review files'
                    : row.status === 'awaiting-approval'
                    ? 'Request/confirm approval'
                    : row.status === 'quality-check'
                    ? 'Run QA'
                    : row.status === 'ready-to-dispatch'
                    ? 'Dispatch order'
                    : 'Advance workflow'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
              >
                Open order
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                Review artwork
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
                disabled={pendingOrderId === row.id}
                onClick={() => handleAdvance(row.id, row.status)}
              >
                Advance status
              </button>
            </div>
          </div>
        ))}

        {!filteredRows.length ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
          >
            No orders match the selected status filter.
          </div>
        ) : null}
      </div>
    </div>
  );
}
