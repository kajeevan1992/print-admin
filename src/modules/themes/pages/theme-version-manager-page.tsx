'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, History, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { themesService } from '@/services/themes.service';
import type { StorefrontThemeAdminState } from '@/modules/themes/types';

type HistoryItem = {
  id: string;
  version: number;
  themeKey: string;
  publishedAt: string;
  actorId: string;
  source: string;
  restoredFromVersion: number | null;
  current: boolean;
  summary: { homepageSections: number; contentPages: number; navigationItems: number; mediaAssets: number };
};

type HistoryState = {
  store: { id: string; slug: string; name: string };
  currentVersion: number;
  retentionLimit: number;
  items: HistoryItem[];
};

type Envelope<T> = { ok?: boolean; data?: T; error?: { message?: string } | string };

function message(payload: Envelope<unknown>, fallback: string) {
  if (typeof payload.error === 'string') return payload.error;
  return payload.error?.message || fallback;
}

function date(value: string) {
  if (!value) return 'Unknown time';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function ThemeVersionManagerPage() {
  const [admin, setAdmin] = useState<StorefrontThemeAdminState | null>(null);
  const [storeSlug, setStoreSlug] = useState('');
  const [history, setHistory] = useState<HistoryState | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const selectedStore = useMemo(() => admin?.stores.find((store) => store.slug === storeSlug) || null, [admin, storeSlug]);

  async function loadHistory(nextStoreSlug: string) {
    if (!nextStoreSlug) return setHistory(null);
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/internal/storefront-publish-history?storeSlug=${encodeURIComponent(nextStoreSlug)}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({})) as Envelope<HistoryState>;
      if (!response.ok || !payload.ok || !payload.data) throw new Error(message(payload, 'Publish history could not load.'));
      setHistory(payload.data);
      setSelectedVersion(null);
      setConfirmation('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Publish history could not load.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    themesService.getAdminState().then((response) => {
      const state = response.data;
      setAdmin(state);
      const first = state.selectedStore?.slug || state.stores[0]?.slug || '';
      setStoreSlug(first);
      return loadHistory(first);
    }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'Storefronts could not load.');
      setLoading(false);
    });
  }, []);

  async function restore(item: HistoryItem) {
    const required = `RESTORE VERSION ${item.version}`;
    if (confirmation.trim() !== required) return setError(`Type ${required} before restoring.`);
    if (!window.confirm(`Restore version ${item.version} as a new live version? The current live version remains in history.`)) return;
    setWorking(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/internal/storefront-publish-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          storeSlug,
          version: item.version,
          expectedCurrentVersion: history?.currentVersion,
          confirmation: confirmation.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({})) as Envelope<{ restored: { publishedVersion: number }; history: HistoryState }>;
      if (!response.ok || !payload.ok || !payload.data) throw new Error(message(payload, 'Storefront version could not be restored.'));
      setHistory(payload.data.history);
      setSelectedVersion(null);
      setConfirmation('');
      setNotice(`Version ${item.version} was restored and published as version ${payload.data.restored.publishedVersion}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Storefront version could not be restored.');
    } finally {
      setWorking(false);
    }
  }

  const actions = <><Link href="/themes" className="inline-flex items-center gap-2 rounded-xl border border-white/8 px-3.5 py-2 text-[12px] text-text no-underline"><History className="h-4 w-4" />Storefront Builder</Link>{selectedStore ? <Link href={selectedStore.previewUrl} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-white/8 px-3.5 py-2 text-[12px] text-text no-underline"><ExternalLink className="h-4 w-4" />View live</Link> : null}<Button onClick={() => void loadHistory(storeSlug)} disabled={!storeSlug || loading}>Refresh</Button></>;

  return <div className="space-y-5"><PageHeader title="Storefront Publish History" subtitle="Review immutable live snapshots and restore an earlier storefront safely as a new published version." actions={actions} />{error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}{notice ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}<Card><div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><div><label className="mb-2 block text-[12px] font-medium text-text">Storefront</label><Select value={storeSlug} options={(admin?.stores || []).map((store) => ({ label: `${store.name} · ${store.status}`, value: store.slug }))} onChange={(event) => { setStoreSlug(event.target.value); void loadHistory(event.target.value); }} /></div><div className="flex gap-2 text-[11px] text-textMuted"><span className="rounded-full bg-panelMuted px-3 py-2">Live v{history?.currentVersion || 0}</span><span className="rounded-full bg-panelMuted px-3 py-2">Keeps {history?.retentionLimit || 50} versions</span></div></div></Card>{loading ? <Card><p className="text-sm text-textMuted">Loading publish history…</p></Card> : null}{!loading && history ? <Card><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-white">{history.store.name}</h2><p className="mt-1 text-xs text-textMuted">Restoring creates a new version. It never deletes or rewrites the existing history.</p></div><span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-textMuted">{history.items.length} snapshot{history.items.length === 1 ? '' : 's'}</span></div><div className="space-y-3">{history.items.map((item) => <article key={item.id} className={`rounded-2xl border p-4 ${item.current ? 'border-emerald-500/35 bg-emerald-500/[0.06]' : 'border-white/8 bg-white/[0.025]'}`}><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-white">Version {item.version}</strong><span className="rounded-full bg-panelMuted px-2.5 py-1 text-[10px] text-textMuted">{item.themeKey}</span>{item.current ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] text-emerald-200">Live</span> : null}{item.source === 'restore' ? <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] text-amber-100">Restored from v{item.restoredFromVersion}</span> : null}</div><p className="mt-2 text-[11px] text-textMuted">Published {date(item.publishedAt)}{item.actorId ? ` · by ${item.actorId}` : ''}</p><div className="mt-3 flex flex-wrap gap-2 text-[10px] text-textMuted"><span className="rounded-lg bg-panelMuted px-2.5 py-1.5">{item.summary.homepageSections} homepage sections</span><span className="rounded-lg bg-panelMuted px-2.5 py-1.5">{item.summary.contentPages} pages</span><span className="rounded-lg bg-panelMuted px-2.5 py-1.5">{item.summary.navigationItems} navigation items</span><span className="rounded-lg bg-panelMuted px-2.5 py-1.5">{item.summary.mediaAssets} uploaded images</span></div></div>{!item.current ? <div className="min-w-[290px] rounded-xl border border-white/8 bg-black/10 p-3"><label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">Type RESTORE VERSION {item.version}</label><Input value={selectedVersion === item.version ? confirmation : ''} onFocus={() => { setSelectedVersion(item.version); setConfirmation(''); }} onChange={(event) => { setSelectedVersion(item.version); setConfirmation(event.target.value.toUpperCase()); }} placeholder={`RESTORE VERSION ${item.version}`} /><PrimaryButton className="mt-2 w-full" disabled={working || selectedVersion !== item.version || confirmation.trim() !== `RESTORE VERSION ${item.version}`} onClick={() => void restore(item)}><RotateCcw className="mr-2 h-4 w-4" />Restore as new live version</PrimaryButton></div> : null}</div></article>)}{!history.items.length ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-textMuted">No live storefront version has been published yet.</div> : null}</div></Card> : null}</div>;
}
