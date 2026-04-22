'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminOrderControlSeed } from '@/data/admin-order-control';

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

function normalizeStatuses(payload: any): string[] {
  const raw = payload?.payload?.data || payload?.payload || [];
  if (!Array.isArray(raw)) return adminOrderControlSeed.map((row) => row.status);
  const mapped = raw.map((order: any) => mapStatus(order.status));
  return mapped.length ? mapped : adminOrderControlSeed.map((row) => row.status);
}

export function AdminOrderControlSummary() {
  const [statuses, setStatuses] = useState<string[]>(adminOrderControlSeed.map((row) => row.status));
  const [source, setSource] = useState('Seeded summary');

  useEffect(() => {
    let active = true;
    async function loadSummary() {
      try {
        const res = await fetch('/api/proxy/admin-orders', { cache: 'no-store' });
        const payload = await res.json().catch(() => null);

        if (!res.ok || !payload?.ok) {
          if (active) setSource('Seeded summary');
          return;
        }

        const normalized = normalizeStatuses(payload);
        if (active) {
          setStatuses(normalized);
          setSource(normalized.length ? 'Live API summary' : 'Seeded summary');
        }
      } catch {
        if (active) setSource('Seeded summary');
      }
    }
    loadSummary();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    return {
      artworkReview: statuses.filter((s) => s === 'artwork-review').length,
      awaitingApproval: statuses.filter((s) => s === 'awaiting-approval').length,
      inProduction: statuses.filter((s) => s === 'in-production').length,
      qualityCheck: statuses.filter((s) => s === 'quality-check').length,
    };
  }, [statuses]);

  return (
    <div className="space-y-4">
      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Control summary</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {source}
        </p>
        <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <p>• {counts.artworkReview} job(s) in artwork review</p>
          <p>• {counts.awaitingApproval} job(s) awaiting approval</p>
          <p>• {counts.inProduction} job(s) currently in production</p>
          <p>• {counts.qualityCheck} job(s) currently in quality check</p>
        </div>
      </div>

      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Admin next stage</p>
        <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <p>• connect real order details and item views</p>
          <p>• wire artwork review and approval actions</p>
          <p>• connect production-stage transitions and dispatch events</p>
          <p>• add tenant-aware SLA and assignee rules</p>
        </div>
      </div>
    </div>
  );
}
