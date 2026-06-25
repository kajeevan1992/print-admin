'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Row = Record<string, any>;
export function DesignBundleManagerPage() {
  const [themeKey, setThemeKey] = useState('holo-default');
  const [chosen, setChosen] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState('Design bundle manager ready.');
  async function load() { const q = themeKey ? `?themeKey=${encodeURIComponent(themeKey)}` : ''; const res = await fetch(`/api/internal/platform/theme-bundles${q}`, { cache: 'no-store' }); const payload = await res.json().catch(() => ({})); setRows(payload.data?.items || []); setMessage(payload?.ok === false ? payload.error : 'Design bundles loaded.'); }
  async function send() { if (!chosen) { setMessage('Choose a .zip bundle first.'); return; } const fd = new FormData(); fd.append('file', chosen); const res = await fetch('/api/internal/platform/theme-bundles', { method: 'POST', body: fd }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) { setMessage(payload?.error || 'Bundle save failed.'); return; } setThemeKey(payload.data.themeKey); setMessage(`Bundle stored for ${payload.data.themeKey} v${payload.data.version}.`); await load(); }
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4"><PageHeader title="Design Bundle Manager" subtitle="Store and validate hosted theme design bundles from Super Admin." actions={<Button onClick={() => void load()}>Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input value={themeKey} onChange={(e) => setThemeKey(e.target.value)} placeholder="Theme key filter" /><Button onClick={() => void load()}>Load</Button></div><input className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white" type="file" accept=".zip" onChange={(e) => setChosen(e.target.files?.[0] || null)} /><PrimaryButton className="mt-3" onClick={send}>Store bundle</PrimaryButton></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Stored bundles</h3><div className="space-y-2">{rows.map((item) => <div key={item.slug} className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><strong className="text-white">{item.themeKey} v{item.version}</strong><p className="text-xs text-textMuted">{item.filename} · {Math.round((item.sizeBytes || 0)/1024)}KB · {item.storageMode}</p></div>)}</div></Card></div>;
}
