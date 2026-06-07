'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MapPin, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type CollectionPoint = {
  id: string;
  slug: string;
  name: string;
  kind: 'owned-branch' | 'partner-collection' | 'service-area';
  status: 'active' | 'inactive' | 'draft';
  areaName: string;
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  postcode?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  openingHours?: Record<string, string>;
  collectionInstructions?: string;
  customerNotes?: string;
  partnerNotes?: string;
  checkoutEnabled: boolean;
  publicPageEnabled: boolean;
  googleBusinessEligible: boolean;
  productAvailabilityMode: 'all-products' | 'selected-products' | 'excluded-products';
  productSlugs: string[];
  excludedProductSlugs: string[];
  seoPath: string;
  sortOrder: number;
};

type Summary = { total: number; active: number; checkoutEnabled: number; ownedBranches: number; partnerPoints: number; serviceAreas: number };

type FormState = Omit<CollectionPoint, 'id' | 'openingHours' | 'productSlugs' | 'excludedProductSlugs' | 'checkoutEnabled' | 'publicPageEnabled' | 'googleBusinessEligible'> & {
  id: string;
  openingHours: string;
  productSlugs: string;
  excludedProductSlugs: string;
  checkoutEnabled: string;
  publicPageEnabled: string;
  googleBusinessEligible: string;
};

const defaultHours = { monday: '09:00-17:30', tuesday: '09:00-17:30', wednesday: '09:00-17:30', thursday: '09:00-17:30', friday: '09:00-17:30', saturday: '09:00-17:30', sunday: 'Closed' };

const emptyForm: FormState = {
  id: '', slug: '', name: '', kind: 'partner-collection', status: 'draft', areaName: '', addressLine1: '', addressLine2: '', town: '', postcode: '', country: 'United Kingdom', contactName: '', contactEmail: '', contactPhone: '', openingHours: JSON.stringify(defaultHours, null, 2), collectionInstructions: '', customerNotes: '', partnerNotes: '', checkoutEnabled: 'false', publicPageEnabled: 'true', googleBusinessEligible: 'false', productAvailabilityMode: 'all-products', productSlugs: '', excludedProductSlugs: '', seoPath: '', sortOrder: 100,
};

function csv(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function safeJson(value: string) { try { const parsed = JSON.parse(value || '{}'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : defaultHours; } catch { return defaultHours; } }
function bool(value: string) { return value === 'true'; }
function slugify(value: string) { return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function seoPath(kind: string, slug: string) { const clean = slugify(slug); if (!clean) return ''; if (kind === 'owned-branch') return `/locations/${clean}`; if (kind === 'service-area') return `/printing/${clean}`; return `/print-collection/${clean}`; }
function formFrom(item?: CollectionPoint | null): FormState { if (!item) return emptyForm; return { ...item, openingHours: JSON.stringify(item.openingHours || defaultHours, null, 2), checkoutEnabled: String(Boolean(item.checkoutEnabled)), publicPageEnabled: String(item.publicPageEnabled !== false), googleBusinessEligible: String(Boolean(item.googleBusinessEligible)), productSlugs: (item.productSlugs || []).join(', '), excludedProductSlugs: (item.excludedProductSlugs || []).join(', ') }; }

export function CollectionPointsPage() {
  const [items, setItems] = useState<CollectionPoint[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, checkoutEnabled: 0, ownedBranches: 0, partnerPoints: 0, serviceAreas: 0 });
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ search, kind, status });
    const res = await fetch(`/api/internal/collection-points?${params.toString()}`, { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Collection points failed to load.');
    const next = payload.data?.items || [];
    setItems(next);
    setSummary(payload.data?.summary || summary);
    setSelectedId((current) => current || next[0]?.id || '');
    setLoading(false);
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);
  useEffect(() => { setForm(formFrom(selected)); }, [selected?.id]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); }

  function startNew(nextKind: CollectionPoint['kind'] = 'partner-collection') {
    const base = { ...emptyForm, kind: nextKind, googleBusinessEligible: nextKind === 'owned-branch' ? 'true' : 'false' };
    base.seoPath = seoPath(base.kind, base.slug || base.areaName || base.name);
    setSelectedId('');
    setForm(base);
    setMessage('Creating a new collection point.');
  }

  async function save() {
    const slug = form.slug || slugify(form.areaName || form.name);
    const body = {
      ...form,
      slug,
      seoPath: form.seoPath || seoPath(form.kind, slug),
      checkoutEnabled: bool(form.checkoutEnabled),
      publicPageEnabled: bool(form.publicPageEnabled),
      googleBusinessEligible: form.kind === 'owned-branch' && bool(form.googleBusinessEligible),
      openingHours: safeJson(form.openingHours),
      productSlugs: csv(form.productSlugs),
      excludedProductSlugs: csv(form.excludedProductSlugs),
      sortOrder: Number(form.sortOrder || 100),
    };
    const res = await fetch('/api/internal/collection-points', { method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Collection point save failed.');
    setMessage(`Saved ${payload.data?.item?.name || body.name}. SEO page was synced if public page is enabled.`);
    await load();
    setSelectedId(payload.data?.item?.id || '');
  }

  async function seed() {
    const res = await fetch('/api/internal/collection-points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seed' }) });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Collection point seed failed.');
    setMessage(`Seeded ${payload.data?.count || 0} collection/location records.`);
    await load();
  }

  async function remove(item: CollectionPoint) {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    const res = await fetch(`/api/internal/collection-points?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Delete failed.');
    setMessage(`Deleted ${item.name}.`);
    setSelectedId('');
    await load();
  }

  return (
    <div>
      <PageHeader title="Collection Points" subtitle="Manage owned branches, partner collection points and service areas. Checkout-ready points sync with SEO Engine without duplicate storage." actions={<><Button onClick={() => void load()}>Refresh</Button><Button onClick={() => void seed()}>Seed defaults</Button><PrimaryButton onClick={() => void save()}>Save point</PrimaryButton></>} />
      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
      <div className="mb-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6"><Metric label="Total" value={summary.total} /><Metric label="Active" value={summary.active} tone="green" /><Metric label="Checkout" value={summary.checkoutEnabled} tone="blue" /><Metric label="Owned branches" value={summary.ownedBranches} /><Metric label="Partners" value={summary.partnerPoints} tone="purple" /><Metric label="Service areas" value={summary.serviceAreas} tone="amber" /></div>
      <Card className="mb-4"><div className="grid gap-3 md:grid-cols-[1fr_190px_190px_auto]"><Input placeholder="Search area, postcode, town or name..." value={search} onChange={(e) => setSearch(e.target.value)} /><Select value={kind} onChange={(e) => setKind(e.target.value)} options={[{ value: 'all', label: 'All types' }, { value: 'owned-branch', label: 'Owned branches' }, { value: 'partner-collection', label: 'Partner collection' }, { value: 'service-area', label: 'Service areas' }]} /><Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'all', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'inactive', label: 'Inactive' }]} /><Button onClick={() => void load()}>Apply</Button></div></Card>
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden p-0"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/6 p-4"><h3 className="text-sm font-semibold text-white">Locations and collection points</h3><div className="flex flex-wrap gap-2"><Button onClick={() => startNew('owned-branch')}>New branch</Button><Button onClick={() => startNew('partner-collection')}>New partner</Button><Button onClick={() => startNew('service-area')}>New service area</Button></div></div>{loading ? <div className="p-6 text-sm text-textMuted">Loading collection points...</div> : null}<div className="divide-y divide-white/6">{items.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`grid w-full gap-2 p-4 text-left hover:bg-white/[0.04] ${selectedId === item.id ? 'bg-white/[0.06]' : ''}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{item.name}</p><p className="mt-1 text-xs text-textMuted">{item.areaName} · {item.kind} · {item.status}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs ${item.checkoutEnabled && item.status === 'active' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/8 bg-white/[0.03] text-textMuted'}`}>{item.checkoutEnabled && item.status === 'active' ? 'checkout ready' : 'not checkout'}</span></div><div className="flex flex-wrap gap-2 text-[11px] text-textMuted"><Badge>{item.seoPath}</Badge><Badge>{item.productAvailabilityMode}</Badge><Badge>{item.googleBusinessEligible ? 'Google Business eligible' : 'not GBP eligible'}</Badge></div></button>)}{!loading && !items.length ? <div className="p-8 text-center text-sm text-textMuted">No collection points yet. Seed defaults to start.</div> : null}</div></Card>
        <Card><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><MapPin size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Collection point editor</h3></div>{form.id ? <Button onClick={() => selected && void remove(selected)}><Trash2 size={14} /> Delete</Button> : null}</div><div className="grid gap-3"><div className="grid gap-3 md:grid-cols-2"><Edit label="Name" value={form.name} onChange={(v) => setField('name', v)} /><Edit label="Area name" value={form.areaName} onChange={(v) => setField('areaName', v)} /><Edit label="Slug" value={form.slug} onChange={(v) => { setField('slug', v); setField('seoPath', seoPath(form.kind, v)); }} /><Edit label="SEO path" value={form.seoPath} onChange={(v) => setField('seoPath', v)} /><Select value={form.kind} onChange={(e) => { const next = e.target.value as CollectionPoint['kind']; setField('kind', next); setField('seoPath', seoPath(next, form.slug || form.areaName || form.name)); setField('googleBusinessEligible', next === 'owned-branch' ? 'true' : 'false'); }} options={[{ value: 'owned-branch', label: 'Owned Holo Print branch' }, { value: 'partner-collection', label: 'Partner collection point' }, { value: 'service-area', label: 'Service area' }]} /><Select value={form.status} onChange={(e) => setField('status', e.target.value as CollectionPoint['status'])} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></div><div className="grid gap-3 md:grid-cols-2"><Edit label="Address line 1" value={form.addressLine1 || ''} onChange={(v) => setField('addressLine1', v)} /><Edit label="Address line 2" value={form.addressLine2 || ''} onChange={(v) => setField('addressLine2', v)} /><Edit label="Town" value={form.town || ''} onChange={(v) => setField('town', v)} /><Edit label="Postcode" value={form.postcode || ''} onChange={(v) => setField('postcode', v)} /><Edit label="Contact name" value={form.contactName || ''} onChange={(v) => setField('contactName', v)} /><Edit label="Contact phone" value={form.contactPhone || ''} onChange={(v) => setField('contactPhone', v)} /></div><div className="grid gap-3 md:grid-cols-4"><Select value={form.checkoutEnabled} onChange={(e) => setField('checkoutEnabled', e.target.value)} options={[{ value: 'false', label: 'Not in checkout' }, { value: 'true', label: 'Checkout enabled' }]} /><Select value={form.publicPageEnabled} onChange={(e) => setField('publicPageEnabled', e.target.value)} options={[{ value: 'true', label: 'SEO page enabled' }, { value: 'false', label: 'No public SEO page' }]} /><Select value={form.googleBusinessEligible} onChange={(e) => setField('googleBusinessEligible', e.target.value)} options={[{ value: 'false', label: 'Not GBP eligible' }, { value: 'true', label: 'Google Business eligible' }]} /><Select value={form.productAvailabilityMode} onChange={(e) => setField('productAvailabilityMode', e.target.value as CollectionPoint['productAvailabilityMode'])} options={[{ value: 'all-products', label: 'All products' }, { value: 'selected-products', label: 'Selected products only' }, { value: 'excluded-products', label: 'Exclude products' }]} /></div><Edit label="Product slugs for selected mode, comma separated" value={form.productSlugs} onChange={(v) => setField('productSlugs', v)} /><Edit label="Excluded product slugs, comma separated" value={form.excludedProductSlugs} onChange={(v) => setField('excludedProductSlugs', v)} /><Edit label="Collection instructions" value={form.collectionInstructions || ''} onChange={(v) => setField('collectionInstructions', v)} textarea /><Edit label="Customer notes" value={form.customerNotes || ''} onChange={(v) => setField('customerNotes', v)} textarea /><Edit label="Partner/internal notes" value={form.partnerNotes || ''} onChange={(v) => setField('partnerNotes', v)} textarea /><Edit label="Opening hours JSON" value={form.openingHours} onChange={(v) => setField('openingHours', v)} textarea tall /><PrimaryButton onClick={() => void save()}>Save collection point</PrimaryButton><div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">Partner collection points and service areas are automatically marked as not Google Business eligible. Only real staffed branches should use owned branch wording.</div></div></Card>
      </div>
    </div>
  );
}

function Edit({ label, value, onChange, textarea = false, tall = false, disabled = false }: { label: string; value: string | number; onChange?: (value: string) => void; textarea?: boolean; tall?: boolean; disabled?: boolean }) { return <label className="grid gap-1 text-xs text-textMuted">{label}{textarea ? <textarea className={`rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-6 text-white outline-none ${tall ? 'min-h-[150px]' : 'min-h-[92px]'}`} value={String(value || '')} disabled={disabled} onChange={(e) => onChange?.(e.target.value)} /> : <input className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none disabled:opacity-60" value={String(value || '')} disabled={disabled} onChange={(e) => onChange?.(e.target.value)} />}</label>; }
function Metric({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'green' | 'blue' | 'amber' | 'purple' }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'purple' ? 'border-purple-500/30 bg-purple-500/10' : ''; return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
function Badge({ children }: { children: ReactNode }) { return <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">{children}</span>; }
