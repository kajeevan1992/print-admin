'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { Button } from '@/components/ui/buttons';
import { DataTable } from '@/components/data-table/data-table';

type TenantRow = { id: string; name: string; slug: string; status: string; planName: string; storefrontsLimit: number; adminUsersLimit: number };
type Metrics = { tenants: number; activeTenants: number; users: number; orders: number; credentials: number; events: number; stores: number; seats: number };
function statusTone(value: string) { const v = String(value).toLowerCase(); if (v.includes('suspend')) return 'border-rose-400/25 bg-rose-400/10 text-rose-200'; if (v.includes('pending') || v.includes('trial')) return 'border-amber-400/25 bg-amber-400/10 text-amber-100'; return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'; }
export function LiveOwnerReportsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ tenants: 0, activeTenants: 0, users: 0, orders: 0, credentials: 0, events: 0, stores: 0, seats: 0 });
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('Loading live database metrics...');
  async function load() { try { const res = await fetch('/api/internal/platform/live-metrics', { cache: 'no-store' }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Metrics could not load.'); setTenants(payload.data?.tenants || []); setMetrics(payload.data?.metrics || metrics); setMessage('Live database metrics loaded.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Metrics could not load.'); } }
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => tenants.filter((row) => { const q = query.trim().toLowerCase(); return !q || `${row.name} ${row.slug} ${row.status} ${row.planName}`.toLowerCase().includes(q); }), [query, tenants]);
  return <div className="space-y-5"><PageHeader title="Owner Reports" subtitle="Live database metrics only. No demo revenue or sample tenant rows." actions={<Button onClick={() => void load()}>Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<div className="grid gap-4 md:grid-cols-4"><Metric label="Tenants" value={metrics.tenants} /><Metric label="Users" value={metrics.users} /><Metric label="Orders" value={metrics.orders} /><Metric label="Events" value={metrics.events} /></div><div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"><Card className="space-y-4"><div className="relative max-w-sm"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tenants..." className="pl-10" /></div><DataTable columns={[{ key: 'name', header: 'Tenant', render: (row) => row.name }, { key: 'slug', header: 'Slug', render: (row) => row.slug }, { key: 'planName', header: 'Plan', render: (row) => row.planName }, { key: 'adminUsersLimit', header: 'Seats', render: (row) => String(row.adminUsersLimit) }, { key: 'storefrontsLimit', header: 'Stores', render: (row) => String(row.storefrontsLimit) }, { key: 'status', header: 'Status', render: (row) => <span className={`rounded-full border px-2 py-1 text-xs uppercase ${statusTone(row.status)}`}>{row.status}</span> }]} rows={visible} rowKey={(row) => row.id} /></Card><Card><p className="text-xs uppercase tracking-wide text-textMuted">Live summary</p><div className="mt-4 grid gap-3"><Metric label="Active tenants" value={metrics.activeTenants} /><Metric label="Store capacity" value={metrics.stores} /><Metric label="Seat capacity" value={metrics.seats} /><Metric label="Credentials" value={metrics.credentials} /></div></Card></div></div>;
}
function Metric({ label, value }: { label: string; value: number | string }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
