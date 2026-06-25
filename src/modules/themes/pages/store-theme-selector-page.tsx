'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Theme = Record<string, any>;
export function StoreThemeSelectorPage() {
  const [channelSlug, setChannelSlug] = useState('default-store');
  const [items, setItems] = useState<Theme[]>([]);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('Loading allowed themes...');
  const [busy, setBusy] = useState(false);
  async function load(slug = channelSlug) { setBusy(true); try { const res = await fetch(`/api/internal/store-theme-selector?channelSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not load themes.'); setItems(payload.data.items || []); setSelected((current) => current || payload.data.items?.[0]?.themeKey || ''); setMessage('Allowed themes loaded.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load themes.'); } finally { setBusy(false); } }
  async function assign() { setBusy(true); try { const res = await fetch('/api/internal/store-theme-selector', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelSlug, themeKey: selected }) }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not assign theme.'); setMessage(`Theme ${selected} assigned to ${channelSlug}.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not assign theme.'); } finally { setBusy(false); } }
  useEffect(() => { void load('default-store'); }, []);
  return <div className="space-y-4"><PageHeader title="Store Theme Selector" subtitle="Choose a Super Admin-assigned hosted theme for this store/channel." actions={<><Button onClick={() => void load()} disabled={busy}>Refresh</Button><PrimaryButton onClick={assign} disabled={busy || !selected}>Assign selected</PrimaryButton></>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input value={channelSlug} onChange={(e) => setChannelSlug(e.target.value)} placeholder="Store/channel slug" /><Button onClick={() => void load(channelSlug)} disabled={busy}>Load themes</Button></div></Card><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((theme) => <button key={theme.themeKey} type="button" onClick={() => setSelected(theme.themeKey)} className={`rounded-2xl border p-4 text-left ${selected === theme.themeKey ? 'border-sky-400/60 bg-sky-500/10' : 'border-white/8 bg-white/[0.03]'}`}><div className="flex justify-between gap-3"><strong className="text-white">{theme.name}</strong><span className="text-xs text-textMuted">v{theme.version}</span></div><p className="mt-2 text-xs text-textMuted">{theme.description || theme.themeKey}</p><p className="mt-3 text-xs text-textMuted">Sections: {theme.supportedSections?.join(', ') || '-'}</p></button>)}{!items.length ? <Card><p className="text-sm text-textMuted">No themes are assigned to this tenant/store yet. Ask Super Admin to assign one.</p></Card> : null}</div><Card><h3 className="mb-2 text-sm font-semibold text-white">After assigning</h3><p className="text-sm text-textMuted">Open Site Designer, load the same store/channel slug, customise the sections, then publish.</p></Card></div>;
}
