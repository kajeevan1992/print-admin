'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type EndpointRow = { id: string; name: string; channelId: string; url: string; events: string[]; status: string };
export function ChannelEndpointsPage() {
  const [rows, setRows] = useState<EndpointRow[]>([]);
  const [message, setMessage] = useState('Loading channel endpoints...');
  const [form, setForm] = useState({ name: 'External storefront endpoint', channelId: '', url: '', events: 'order.created,order.updated' });
  async function load() { try { const res = await fetch('/api/internal/channel-callbacks', { cache: 'no-store' }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not load endpoints.'); setRows(payload.data?.items || []); setMessage('Channel endpoints loaded.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load endpoints.'); } }
  async function save() { try { const events = form.events.split(',').map((x) => x.trim()).filter(Boolean); const res = await fetch('/api/internal/channel-callbacks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, events }) }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save endpoint.'); setRows(payload.data?.items || []); setMessage('Channel endpoint saved.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save endpoint.'); } }
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4"><PageHeader title="Channel Endpoints" subtitle="Store endpoints for external/headless storefront channels." actions={<Button onClick={() => void load()}>Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><div className="grid gap-3 md:grid-cols-2"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" /><Input value={form.channelId} onChange={(event) => setForm({ ...form, channelId: event.target.value })} placeholder="Channel id or slug" /><Input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://example.com/endpoint" /><Input value={form.events} onChange={(event) => setForm({ ...form, events: event.target.value })} placeholder="order.created,order.updated" /></div><div className="mt-4"><PrimaryButton onClick={() => void save()}>Save endpoint</PrimaryButton></div></Card><Card><div className="grid gap-3">{rows.map((row) => <div key={row.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4"><p className="font-semibold text-white">{row.name}</p><p className="mt-1 text-sm text-textMuted">{row.url}</p><p className="mt-1 text-xs text-textMuted">Channel: {row.channelId || 'all'} · Events: {row.events.join(', ')} · Status: {row.status}</p></div>)}{!rows.length ? <p className="text-sm text-textMuted">No channel endpoints yet.</p> : null}</div></Card></div>;
}
