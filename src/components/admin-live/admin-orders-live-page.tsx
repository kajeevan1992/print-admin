'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  status: string;
  totalMinor: number;
  submittedAt: string;
};

const fallbackRows: OrderRow[] = [
  { id: '1', orderNumber: 'ORD-1001', customerName: 'Ava Thompson', email: 'ava@example.com', status: 'artwork-review', totalMinor: 4900, submittedAt: '2026-04-20T09:30:00.000Z' },
  { id: '2', orderNumber: 'ORD-1002', customerName: 'Leo Carter', email: 'leo@example.com', status: 'awaiting-approval', totalMinor: 12900, submittedAt: '2026-04-21T13:10:00.000Z' },
];

function money(v:number){return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v/100)}

export function AdminOrdersLivePage() {
  const [rows, setRows] = useState<OrderRow[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Connecting to live orders API...');
  const [source, setSource] = useState<'live'|'fallback'>('fallback');

  const loadRows = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/admin-orders', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        setRows(fallbackRows); setSource('fallback'); setMessage('Live orders endpoint is not available yet. Showing fallback rows.'); return;
      }
      const raw = payload?.payload?.data || payload?.payload || [];
      const normalized = Array.isArray(raw) ? raw.map((o:any)=>({
        id:o.id||o.orderNumber,
        orderNumber:o.orderNumber||o.id,
        customerName:o.customerName||'Customer',
        email:o.email||'—',
        status:o.status||'unknown',
        totalMinor:typeof o.totalMinor==='number'?o.totalMinor:0,
        submittedAt:o.submittedAt||o.createdAt||'—',
      })) : [];
      setRows(normalized.length?normalized:fallbackRows);
      setSource(normalized.length?'live':'fallback');
      setMessage(normalized.length?'Connected to live orders data.':'Orders endpoint returned no rows. Showing fallback rows.');
    } catch {
      setRows(fallbackRows); setSource('fallback'); setMessage('Could not reach the orders endpoint. Showing fallback rows.');
    } finally { setLoading(false); }
  }, []);

  useEffect(()=>{loadRows()}, [loadRows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>Live-first order management route replacement.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>Source: {source === 'live' ? 'Live API' : 'Fallback'}</span>
          <button type="button" className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }} onClick={()=>{setLoading(true);loadRows();}}>{loading?'Refreshing...':'Refresh'}</button>
        </div>
      </div>
      <div className="rounded-3xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
        <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
          {loading ? 'Loading orders...' : message}
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="grid grid-cols-6 gap-3 border-b px-4 py-3 text-xs font-medium uppercase tracking-[0.16em]" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>
            <div>Order</div><div>Customer</div><div>Email</div><div>Status</div><div>Total</div><div>Submitted</div>
          </div>
          {rows.map((row)=>(
            <div key={row.id} className="grid grid-cols-6 gap-3 border-b px-4 py-3 text-sm last:border-b-0" style={{ borderColor:'var(--theme-border)', background:'var(--theme-surface-alt)' }}>
              <div>{row.orderNumber}</div><div>{row.customerName}</div><div>{row.email}</div><div>{row.status}</div><div>{money(row.totalMinor)}</div><div>{row.submittedAt}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
