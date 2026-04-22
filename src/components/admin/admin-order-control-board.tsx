'use client';

import { useEffect, useMemo, useState } from 'react';
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

const statusOptions = [
  'awaiting-artwork',
  'artwork-review',
  'awaiting-approval',
  'in-production',
  'quality-check',
  'ready-to-dispatch',
];

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

function normalizeRows(payload: any): LiveAdminOrderRow[] {
  const raw = payload?.payload?.data || payload?.payload || [];
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

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        const res = await fetch('/api/proxy/admin-orders', { cache: 'no-store' });
        const payload = await res.json().catch(() => null);

        if (!res.ok || !payload?.ok) {
          if (active) {
            setRows(adminOrderControlSeed);
            setMessage('Live admin orders API is not available yet. Showing seeded workflow rows.');
          }
          return;
        }

        const normalized = normalizeRows(payload);

        if (active) {
          setRows(normalized.length ? normalized : adminOrderControlSeed);
          setMessage(
            normalized.length
              ? 'Connected to live admin order data.'
              : 'Orders API connected but returned no rows. Showing seeded workflow rows.'
          );
        }
      } catch {
        if (active) {
          setRows(adminOrderControlSeed);
          setMessage('Could not reach the admin orders API. Showing seeded workflow rows.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      active = false;
    };
  }, []);

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

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-2xl border px-4 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
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

      <div
        className="mt-4 rounded-2xl border px-4 py-3 text-sm"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
      >
        {loading ? 'Loading admin orders...' : message}
      </div>

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
              >
                Update status
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
