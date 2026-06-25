'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Row = Record<string, any>;
export function ThemeVersionManagerPage() {
  const [themeKey, setThemeKey] = useState('holo-default');
  const [items, setItems] = useState<Row[]>([]);
  const [message, setMessage] = useState('Version manager ready.');
  async function load() { const q = themeKey ? `?themeKey=${encodeURIComponent(themeKey)}` : ''; const res = await fetch(`/api/internal/platform/theme-versions${q}`, { cache: 'no-store' }); const payload = await res.json().catch(() => ({})); setItems(payload.data?.items || []); setMessage(payload?.ok === false ? payload.error : 'Versions loaded.'); }
  async function restore(version: string) { const res = await fetch('/api/internal/platform/theme-versions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ themeKey, version }) }); const payload = await res.json().catch(() => ({})); setMessage(payload?.ok === false ? payload.error : `Active version set to ${version}.`); await load(); }
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4"><PageHeader title="Theme Version Manager" subtitle="View theme versions and restore a previous version." actions={<Button onClick={() => void load()}>Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input value={themeKey} onChange={(e) => setThemeKey(e.target.value)} placeholder="Theme key" /><Button onClick={() => void load()}>Load versions</Button></div></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Versions</h3><div className="space-y-2">{items.map((item) => <div key={item.slug} className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-center justify-between gap-3"><div><strong className="text-white">{item.themeKey} v{item.version}</strong><p className="text-xs text-textMuted">{item.status}{item.active ? ' · active' : ''} · {item.notes || '-'}</p></div><Button onClick={() => restore(item.version)}>Make active</Button></div></div>)}{!items.length ? <p className="text-sm text-textMuted">No versions found.</p> : null}</div></Card></div>;
}
