'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Row = Record<string, any>;
export function StoreAllowancePage() {
  const [tenantId, setTenantId] = useState('holo-print');
  const [tenantName, setTenantName] = useState('HOLO Print');
  const [maxStores, setMaxStores] = useState(1);
  const [items, setItems] = useState<Row[]>([]);
  const [message, setMessage] = useState('Loading store allowances...');
  const [busy, setBusy] = useState(false);
  async function load() { setBusy(true); try { const res = await fetch('/api/internal/platform/store-allowance', { cache: 'no-store' }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not load allowances.'); setItems(payload.data.items || []); setMessage('Store allowances loaded.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load allowances.'); } finally { setBusy(false); } }
  async function save() { setBusy(true); try { const res = await fetch('/api/internal/platform/store-allowance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, tenantName, maxStores }) }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save allowance.'); setMessage(`Saved ${maxStores} store allowance for ${tenantId}.`); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save allowance.'); } finally { setBusy(false); } }
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4"><PageHeader title="Store Allowances" subtitle="Super Admin controls how many stores/channels each tenant can create." actions={<Button onClick={() => void load()} disabled={busy}>Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><h3 className="mb-3 text-sm font-semibold text-white">Set tenant allowance</h3><div className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]"><Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Tenant id or slug" /><Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Tenant name" /><Input type="number" min={1} value={maxStores} onChange={(e) => setMaxStores(Number(e.target.value || 1))} /><PrimaryButton onClick={save} disabled={busy}>Save limit</PrimaryButton></div><p className="mt-2 text-xs text-textMuted">Best flow: create first/default store during tenant setup, then tenant admin creates more stores up to this limit.</p></Card><div className="grid gap-4 xl:grid-cols-2">{items.map((item) => <Card key={item.tenantId}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black text-white">{item.tenantName}</h3><p className="mt-1 text-sm text-textMuted">Tenant: {item.tenantId}</p></div><Button onClick={() => { setTenantId(item.tenantId); setTenantName(item.tenantName); setMaxStores(item.maxStores); }}>Edit</Button></div><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xl font-black text-white">{item.maxStores}</p><p className="text-xs text-textMuted">Allowed</p></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xl font-black text-white">{item.usedStores}</p><p className="text-xs text-textMuted">Used</p></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xl font-black text-white">{item.remainingStores}</p><p className="text-xs text-textMuted">Remaining</p></div></div></Card>)}{!items.length ? <Card><p className="text-sm text-textMuted">No explicit allowances yet. Tenants default to 1 store until Super Admin sets a higher limit.</p></Card> : null}</div></div>;
}
