'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Theme = Record<string, any>;
export function ThemeMarketplacePage() {
  const [channelSlug, setChannelSlug] = useState('default-store');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('Loading available themes...');
  async function load(slug = channelSlug) { const res = await fetch(`/api/internal/store-theme-selector?channelSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) { setMessage(payload?.error || 'Could not load available themes.'); return; } setThemes(payload.data.items || []); setSelected(payload.data.items?.[0]?.themeKey || ''); setMessage('Available themes loaded.'); }
  async function useTheme(themeKey = selected) { const res = await fetch('/api/internal/store-theme-selector', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelSlug, themeKey }) }); const payload = await res.json().catch(() => ({})); setMessage(payload?.ok === false ? payload.error : `${themeKey} selected for ${channelSlug}.`); }
  useEffect(() => { void load('default-store'); }, []);
  return <div className="space-y-4"><PageHeader title="Theme Marketplace" subtitle="Tenant-visible theme catalogue. Only Super Admin-assigned themes appear here." actions={<Button onClick={() => void load()}>Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input value={channelSlug} onChange={(e) => setChannelSlug(e.target.value)} placeholder="Store/channel slug" /><Button onClick={() => void load(channelSlug)}>Load marketplace</Button></div></Card><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{themes.map((theme) => <button key={theme.themeKey} type="button" onClick={() => setSelected(theme.themeKey)} className={`rounded-2xl border p-4 text-left ${selected === theme.themeKey ? 'border-sky-400/60 bg-sky-500/10' : 'border-white/8 bg-white/[0.03]'}`}><div className="aspect-video rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/25 to-slate-900/40" /> <div className="mt-4 flex items-start justify-between gap-3"><div><strong className="text-white">{theme.name}</strong><p className="mt-1 text-xs text-textMuted">{theme.description || theme.themeKey}</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-xs text-textMuted">v{theme.version}</span></div><p className="mt-3 text-xs text-textMuted">{theme.supportedSections?.join(', ') || 'Standard sections'}</p><PrimaryButton className="mt-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void useTheme(theme.themeKey); }}>Use this theme</PrimaryButton></button>)}{!themes.length ? <Card><p className="text-sm text-textMuted">No themes assigned to this tenant/store yet.</p></Card> : null}</div></div>;
}
