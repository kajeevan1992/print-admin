'use client';

import { useMemo, useState } from 'react';
import { adminOrderControlSeed } from '@/data/admin-order-control';
import { AdminOrderStatusBadge } from './admin-order-status-badge';
import { AdminPriorityBadge } from './admin-priority-badge';

export function AdminOrderControlBoard() {
  const [filter, setFilter] = useState('all');

  const rows = useMemo(
    () => adminOrderControlSeed.filter((row) => filter === 'all' || row.status === filter),
    [filter]
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

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
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
                Open job
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                Change status
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
              >
                View artwork
              </button>
            </div>
          </div>
        ))}

        {!rows.length ? (
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
