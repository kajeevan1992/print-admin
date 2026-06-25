'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Check = { label: string; ok: boolean; detail: string };
export function StoreDesignGoLivePage() {
  const [channelSlug, setChannelSlug] = useState('default-store');
  const [checks, setChecks] = useState<Check[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Checking readiness...');
  async function load(slug = channelSlug) { const res = await fetch(`/api/internal/store-theme-publish?channelSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) { setMessage(payload?.error || 'Check failed.'); return; } setChecks(payload.data.checks || []); setReady(Boolean(payload.data.ready)); setMessage(payload.data.ready ? 'Store design is ready.' : 'Fix warnings before going live.'); }
  async function goLive() { const res = await fetch('/api/internal/store-theme-publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelSlug }) }); const payload = await res.json().catch(() => ({})); setMessage(payload?.ok === false ? payload.error : 'Store design marked live.'); await load(); }
  useEffect(() => { void load('default-store'); }, []);
  return <div className="space-y-4"><PageHeader title="Store Design Go Live" subtitle="Final live step for the selected store design and current Site Designer draft." actions={<><Button onClick={() => void load()}>Refresh</Button><PrimaryButton disabled={!ready} onClick={goLive}>Go live</PrimaryButton></>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input value={channelSlug} onChange={(e) => setChannelSlug(e.target.value)} placeholder="Store/channel slug" /><Button onClick={() => void load(channelSlug)}>Check</Button></div></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Checks</h3><div className="space-y-2">{checks.map((check) => <div key={check.label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><strong className={check.ok ? 'text-emerald-300' : 'text-amber-300'}>{check.ok ? 'PASS' : 'WARN'}</strong><span className="ml-2 text-white">{check.label}</span><p className="mt-1 text-xs text-textMuted">{check.detail}</p></div>)}</div></Card></div>;
}
