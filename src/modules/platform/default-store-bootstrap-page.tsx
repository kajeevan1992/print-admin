'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type StoreResult = { id: string; tenantSlug: string; name: string; storeType: string; defaultSubdomain: string };
export function DefaultStoreBootstrapPage() {
  const [stores, setStores] = useState<StoreResult[]>([]);
  const [message, setMessage] = useState('Run this after creating tenant owner accounts to ensure every tenant has a default hosted store channel.');
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const response = await fetch('/api/internal/platform/channel-defaults', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not bootstrap default stores.');
      setStores(payload.data?.stores || []);
      setMessage(`Checked ${payload.data?.tenantsChecked || 0} tenant(s). Default hosted store records are ready.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not bootstrap default stores.');
    } finally {
      setBusy(false);
    }
  }
  return <div className="space-y-4"><PageHeader title="Default Store Bootstrap" subtitle="Create the default hosted storefront channel for each tenant after tenant owner setup." actions={<PrimaryButton onClick={() => void run()} disabled={busy}>{busy ? 'Running...' : 'Create / refresh default stores'}</PrimaryButton>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><div className="grid gap-3">{stores.map((store) => <div key={store.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4"><p className="font-semibold text-white">{store.name}</p><p className="mt-1 text-sm text-textMuted">Tenant: {store.tenantSlug} · Type: {store.storeType} · Subdomain: {store.defaultSubdomain}</p></div>)}{!stores.length ? <p className="text-sm text-textMuted">No bootstrap run results yet.</p> : null}</div></Card><Card><p className="text-sm text-textMuted">This keeps the model clean: Tenant owns the business account, Tenant Owner manages admin, Store Channel controls hosted/external storefront behaviour.</p></Card></div>;
}
