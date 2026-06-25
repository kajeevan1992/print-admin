'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Channel = { slug: string; name: string; domain?: string; status?: string };
type Binding = { domain: string; storeSlug: string; status: string; isPrimary: boolean; dnsTarget?: string; verificationToken?: string };
export function StoreDomainsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [items, setItems] = useState<Binding[]>([]);
  const [domain, setDomain] = useState('');
  const [storeSlug, setStoreSlug] = useState('default-store');
  const [message, setMessage] = useState('Loading store domains...');
  const [busy, setBusy] = useState(false);
  async function load() { setBusy(true); try { const [storesRes, domainsRes] = await Promise.all([fetch('/api/internal/store-channels', { cache: 'no-store' }), fetch('/api/internal/store-domains', { cache: 'no-store' })]); const storesPayload = await storesRes.json().catch(() => ({})); const domainsPayload = await domainsRes.json().catch(() => ({})); const nextChannels = storesPayload.data?.items || []; setChannels(nextChannels); setItems(domainsPayload.data?.items || []); if (nextChannels[0]?.slug) setStoreSlug((current) => current === 'default-store' ? nextChannels[0].slug : current); setMessage('Store domains loaded.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Store domains could not load.'); } finally { setBusy(false); } }
  async function save() { setBusy(true); try { const res = await fetch('/api/internal/store-domains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, storeSlug }) }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Domain save failed.'); setDomain(''); setMessage('Domain binding saved. Add the DNS record shown below, then verify later.'); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Domain save failed.'); } finally { setBusy(false); } }
  async function remove(nextDomain: string) { setBusy(true); try { await fetch(`/api/internal/store-domains?domain=${encodeURIComponent(nextDomain)}`, { method: 'DELETE' }); await load(); setMessage('Domain removed.'); } finally { setBusy(false); } }
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4"><PageHeader title="Store Domains" subtitle="Bind subdomains or custom domains to the correct store/channel for this tenant." actions={<Button onClick={() => void load()} disabled={busy}>Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><h3 className="mb-3 text-sm font-semibold text-white">Add domain</h3><div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]"><Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com or print.example.com" /><Select value={storeSlug} options={channels.length ? channels.map((item) => ({ label: item.name || item.slug, value: item.slug })) : [{ label: 'Create a store first', value: 'default-store' }]} onChange={(e) => setStoreSlug(e.target.value)} /><PrimaryButton onClick={save} disabled={busy || !domain || !channels.length}>Save domain</PrimaryButton></div><p className="mt-2 text-xs text-textMuted">One domain points to one store/channel. If the tenant has multiple stores, add one domain per store.</p></Card><div className="grid gap-4 xl:grid-cols-2">{items.map((item) => <Card key={item.domain}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black text-white">{item.domain}</h3><p className="mt-1 text-sm text-textMuted">Store: {item.storeSlug}</p><p className="mt-1 text-xs text-textMuted">Status: {item.status}</p></div><Button onClick={() => remove(item.domain)} disabled={busy}>Remove</Button></div><div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3 text-xs text-textMuted"><p className="font-semibold text-white">DNS target</p><p>{item.dnsTarget || 'Set STOREFRONT_CNAME_TARGET / NEXT_PUBLIC_APP_HOST in env'}</p><p className="mt-2 font-semibold text-white">Verification token</p><p>{item.verificationToken || '-'}</p></div></Card>)}{!items.length ? <Card><p className="text-sm text-textMuted">No domains added yet.</p></Card> : null}</div></div>;
}
