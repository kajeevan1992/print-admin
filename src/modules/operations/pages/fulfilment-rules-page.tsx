'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock3, MapPin, RefreshCw, Save, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

 type MethodRow = { id: string; slug: string; name: string; description: string; metadataJson?: Record<string, any> };
type Draft = {
  timezone: string;
  dailyCapacity: string;
  reservationMinutes: string;
  workingDays: string;
  blackoutDates: string;
  collectionPointSlugs: string;
  storeSlugs: string;
  maxBasketLines: string;
  maxItemCount: string;
  pricePerKg: string;
  postcodePriceBands: string;
};

const EMPTY: Draft = { timezone: 'Europe/London', dailyCapacity: '', reservationMinutes: '45', workingDays: '1,2,3,4,5', blackoutDates: '', collectionPointSlugs: '', storeSlugs: '', maxBasketLines: '', maxItemCount: '', pricePerKg: '', postcodePriceBands: '[]' };

function text(value: unknown) { return String(value || '').trim(); }
function list(value: unknown) { return Array.isArray(value) ? value.map(String).join(',') : ''; }
function lines(value: string) { return value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean); }
function numberOrUndefined(value: string, multiplier = 1) { if (!value.trim()) return undefined; const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next * multiplier) : undefined; }
function draftFrom(row: MethodRow | null): Draft {
  if (!row) return EMPTY;
  const meta = row.metadataJson || {};
  return {
    timezone: text(meta.timezone) || 'Europe/London',
    dailyCapacity: meta.dailyCapacity === undefined ? '' : String(meta.dailyCapacity),
    reservationMinutes: meta.reservationMinutes === undefined ? '45' : String(meta.reservationMinutes),
    workingDays: list(meta.workingDays) || (meta.fulfilmentMode === 'collection' ? '1,2,3,4,5,6' : '1,2,3,4,5'),
    blackoutDates: Array.isArray(meta.blackoutDates) ? meta.blackoutDates.join('\n') : '',
    collectionPointSlugs: list(meta.collectionPointSlugs),
    storeSlugs: list(meta.storeSlugs),
    maxBasketLines: meta.maxBasketLines === undefined ? '' : String(meta.maxBasketLines),
    maxItemCount: meta.maxItemCount === undefined ? '' : String(meta.maxItemCount),
    pricePerKg: meta.pricePerKgMinor === undefined ? '' : (Number(meta.pricePerKgMinor) / 100).toFixed(2),
    postcodePriceBands: JSON.stringify(Array.isArray(meta.postcodePriceBands) ? meta.postcodePriceBands : [], null, 2),
  };
}

export function FulfilmentRulesPage() {
  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(() => methods.find((method) => method.id === selectedId || method.slug === selectedId) || methods[0] || null, [methods, selectedId]);

  async function load(preferredId?: string) {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/internal/catalog/shipping-methods?limit=200', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Delivery methods could not be loaded.');
      const rows = Array.isArray(payload?.data?.items) ? payload.data.items as MethodRow[] : [];
      setMethods(rows);
      const nextId = preferredId && rows.some((item) => item.id === preferredId || item.slug === preferredId) ? preferredId : rows[0]?.id || '';
      setSelectedId(nextId);
      setDraft(draftFrom(rows.find((item) => item.id === nextId || item.slug === nextId) || rows[0] || null));
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Delivery methods could not be loaded.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function choose(id: string) {
    setSelectedId(id); setNotice(''); setError('');
    setDraft(draftFrom(methods.find((item) => item.id === id || item.slug === id) || null));
  }

  async function save() {
    if (!selected) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const workingDays = lines(draft.workingDays).map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
      let postcodePriceBands: unknown = [];
      try { postcodePriceBands = JSON.parse(draft.postcodePriceBands || '[]'); } catch { throw new Error('Postcode price bands must be valid JSON.'); }
      if (!Array.isArray(postcodePriceBands)) throw new Error('Postcode price bands must be a JSON array.');
      const response = await fetch('/api/internal/catalog/shipping-methods', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          slug: selected.slug,
          name: selected.name,
          description: selected.description,
          metadataJson: {
            timezone: draft.timezone || 'Europe/London',
            dailyCapacity: numberOrUndefined(draft.dailyCapacity),
            reservationMinutes: numberOrUndefined(draft.reservationMinutes) || 45,
            workingDays,
            blackoutDates: lines(draft.blackoutDates),
            collectionPointSlugs: lines(draft.collectionPointSlugs),
            storeSlugs: lines(draft.storeSlugs),
            maxBasketLines: numberOrUndefined(draft.maxBasketLines),
            maxItemCount: numberOrUndefined(draft.maxItemCount),
            pricePerKgMinor: numberOrUndefined(draft.pricePerKg, 100),
            postcodePriceBands,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Advanced fulfilment rules could not be saved.');
      setNotice(`Saved advanced rules for ${selected.name}.`);
      await load(selected.id);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Advanced fulfilment rules could not be saved.'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-5">
    <PageHeader title="Advanced Fulfilment Rules" subtitle="Control capacity, working days, blackout dates, store scope, collection-point scope and postcode price bands used by the live storefront evaluator." actions={<div className="flex flex-wrap gap-2"><Link href="/shipping-methods" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white">Delivery Settings</Link><Button onClick={() => void load(selectedId)}><RefreshCw className="mr-2 inline h-4 w-4" />Refresh</Button><PrimaryButton disabled={!selected || saving} onClick={() => void save()}><Save className="mr-2 inline h-4 w-4" />{saving ? 'Saving…' : 'Save rules'}</PrimaryButton></div>} />
    {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div> : null}
    {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <Card className="space-y-3"><div className="flex items-center gap-2 text-white"><Truck size={16} />Delivery methods</div>{loading ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-textMuted">Loading…</div> : methods.map((method) => <button key={method.id} onClick={() => choose(method.id)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === method.id ? 'border-accent bg-accent/10' : 'border-white/8 bg-white/[0.02]'}`}><div className="font-semibold text-white">{method.name}</div><div className="mt-1 text-xs text-textMuted">{text(method.metadataJson?.fulfilmentMode) || 'delivery'} · {text(method.metadataJson?.zoneName) || 'No zone label'}</div></button>)}{!loading && !methods.length ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-textMuted">Add or seed a method in Delivery Settings first.</div> : null}</Card>
      <div className="space-y-4">
        <Card className="space-y-4"><div><div className="text-xs uppercase tracking-[0.22em] text-textMuted">Capacity and schedule</div><h2 className="mt-2 text-xl font-semibold text-white">{selected?.name || 'Choose a method'}</h2></div><div className="grid gap-4 md:grid-cols-2"><label className="space-y-1 text-sm"><span className="text-textMuted">Timezone</span><Input value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} /></label><label className="space-y-1 text-sm"><span className="text-textMuted">Daily capacity (blank = unlimited)</span><Input type="number" min="0" value={draft.dailyCapacity} onChange={(event) => setDraft({ ...draft, dailyCapacity: event.target.value })} /></label><label className="space-y-1 text-sm"><span className="text-textMuted">Capacity hold minutes</span><Input type="number" min="5" value={draft.reservationMinutes} onChange={(event) => setDraft({ ...draft, reservationMinutes: event.target.value })} /></label><label className="space-y-1 text-sm"><span className="text-textMuted">Working days (0=Sun … 6=Sat)</span><Input value={draft.workingDays} onChange={(event) => setDraft({ ...draft, workingDays: event.target.value })} /></label><label className="space-y-1 text-sm md:col-span-2"><span className="text-textMuted">Blackout dates (one YYYY-MM-DD per line)</span><textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white" value={draft.blackoutDates} onChange={(event) => setDraft({ ...draft, blackoutDates: event.target.value })} /></label></div></Card>
        <Card className="space-y-4"><div className="flex items-center gap-2 text-white"><MapPin size={16} />Scope and order limits</div><div className="grid gap-4 md:grid-cols-2"><label className="space-y-1 text-sm"><span className="text-textMuted">Collection point slugs</span><Input placeholder="sidcup, wimbledon" value={draft.collectionPointSlugs} onChange={(event) => setDraft({ ...draft, collectionPointSlugs: event.target.value })} /></label><label className="space-y-1 text-sm"><span className="text-textMuted">Store slugs</span><Input placeholder="default-store" value={draft.storeSlugs} onChange={(event) => setDraft({ ...draft, storeSlugs: event.target.value })} /></label><label className="space-y-1 text-sm"><span className="text-textMuted">Maximum basket lines</span><Input type="number" min="0" value={draft.maxBasketLines} onChange={(event) => setDraft({ ...draft, maxBasketLines: event.target.value })} /></label><label className="space-y-1 text-sm"><span className="text-textMuted">Maximum printed item count</span><Input type="number" min="0" value={draft.maxItemCount} onChange={(event) => setDraft({ ...draft, maxItemCount: event.target.value })} /></label><label className="space-y-1 text-sm"><span className="text-textMuted">Weight price per kg £</span><Input type="number" min="0" step="0.01" value={draft.pricePerKg} onChange={(event) => setDraft({ ...draft, pricePerKg: event.target.value })} /></label></div></Card>
        <Card className="space-y-3"><div className="flex items-center gap-2 text-white"><CalendarDays size={16} />Postcode price bands</div><p className="text-sm text-textMuted">Optional JSON array. Example: <code>[{'{'}"rules":"DA*,BR*","priceMinor":1200,"label":"Local"{'}'}]</code></p><textarea className="min-h-56 w-full rounded-xl border border-white/10 bg-[#08101f] p-4 font-mono text-xs text-white" value={draft.postcodePriceBands} onChange={(event) => setDraft({ ...draft, postcodePriceBands: event.target.value })} /></Card>
        <Card><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 text-cyan-300" /><p className="text-sm leading-6 text-textMuted">Base price, postcode zone rules, cut-off time, production buffer, VAT class and checkout copy remain in <Link href="/shipping-methods" className="font-semibold text-white">Delivery Settings</Link>. This screen adds advanced evaluator controls without replacing that source of truth.</p></div></Card>
      </div>
    </div>
  </div>;
}
