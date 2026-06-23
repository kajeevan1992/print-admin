'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';

type Row = { id: string; orderNumber: string; status: string; currency: string; totalMinor: number };
function amount(row: Row) { return `${row.currency || 'GBP'} ${(Number(row.totalMinor || 0) / 100).toFixed(2)}`; }

export function CustomerHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState('');
  async function load() {
    const response = await fetch('/api/internal/auth/customer/account', { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) { setMessage(payload?.error || 'Please sign in first.'); return; }
    setRows(payload.data?.orders || []);
    setMessage(`Loaded ${payload.data?.orders?.length || 0} linked orders.`);
  }
  useEffect(() => { void load(); }, []);
  return <div className="flex min-h-screen items-center justify-center bg-background p-6"><Card className="w-full max-w-2xl space-y-4"><div><h1 className="text-2xl font-semibold text-white">My Orders</h1><p className="mt-2 text-sm text-textMuted">Orders linked to your customer account by checkout email.</p></div>{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Button onClick={() => void load()}>Refresh</Button><div className="space-y-2">{rows.map((row) => <div key={row.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm"><p className="font-semibold text-white">{row.orderNumber}</p><p className="text-xs text-textMuted">{row.status} · {amount(row)}</p></div>)}{!rows.length ? <p className="text-sm text-textMuted">No linked orders yet.</p> : null}</div></Card></div>;
}
