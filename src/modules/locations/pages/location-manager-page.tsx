'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPin, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type LocationRecord = {
  id: string; slug: string; name: string; type: string; status: string; publicPageEnabled: boolean; seoPageEnabled: boolean; googleBusinessEligible: boolean;
  address?: { line1?: string; town?: string; county?: string; postcode?: string; country?: string };
  contact?: { phone?: string; email?: string };
  cutoffTime?: string; pickupInstructions?: string; customerFacingDescription?: string; collectionFeeMinor?: number; partnerFeeMinor?: number; priority?: number;
  allowedProductSlugs?: string[]; blockedProductSlugs?: string[];
  seo?: { path: string; title: string; metaDescription: string; h1: string; targetKeyword: string; schemaTypes: string[] };
  readiness?: { score: number; warnings: string[]; errors: string[] };
  metadata?: Record<string, any>;
};

type Summary = { total: number; active: number; draft: number; partner: number; serviceArea: number; seoEnabled: number; errors: number; warnings: number };

const typeOptions = ['all', 'main-store', 'owned-branch', 'partner-collection-point', 'service-area'];
const statusOptions = ['all', 'active', 'draft', 'paused', 'hidden'];

function tone(score = 0) {
  if (score >= 85) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (score >= 60) return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-red-500/30 bg-red-500/10 text-red-200';
}
function money(minor = 0) { return `£${(Number(minor || 0) / 100).toFixed(2)}`; }

export function LocationManagerPage() {
  const [items, setItems] = useState<LocationRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, draft: 0, partner: 0, serviceArea: 0, seoEnabled: 0, errors: 0, warnings: 0 });
  const [selectedId, setSelectedId] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ type, status, search });
    const response = await fetch(`/api/internal/locations?${params.toString()}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Locations failed to load.');
    const next = payload.data?.items || [];
    setItems(next);
    setSummary(payload.data?.summary || summary);
    setSelectedId((current) => current || next[0]?.id || '');
    setLoading(false);
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) || items[0] || null, [items, selectedId]);

  async function seed() {
    setMessage('Seeding Holo Print locations...');
    const response = await fetch('/api/internal/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seed' }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Location seed failed.');
    setMessage(`Seeded ${payload.data?.count || 0} locations and synced SEO pages.`);
    await load();
  }

  async function activateSelected() {
    if (!selected) return;
    const response = await fetch('/api/internal/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selected, status: 'active' }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Location activation failed.');
    setMessage(`Activated ${selected.name} and synced SEO.`);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Location Manager"
        subtitle="Manage Holo Print stores, branches, partner collection points and service areas with SEO truth rules and future checkout collection settings."
        actions={<><Button onClick={() => void load()}>Refresh</Button><Button onClick={() => void seed()}>Seed locations</Button><PrimaryButton onClick={() => void activateSelected()} disabled={!selected}>Activate selected</PrimaryButton></>}
      />

      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <Metric label="Total" value={summary.total} />
        <Metric label="Active" value={summary.active} tone="green" />
        <Metric label="Draft" value={summary.draft} tone="amber" />
        <Metric label="Partners" value={summary.partner} tone="blue" />
        <Metric label="Service Areas" value={summary.serviceArea} tone="blue" />
        <Metric label="SEO Enabled" value={summary.seoEnabled} tone="green" />
        <Metric label="Errors" value={summary.errors} tone={summary.errors ? 'red' : 'green'} />
        <Metric label="Warnings" value={summary.warnings} tone={summary.warnings ? 'amber' : 'green'} />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
          <Input placeholder="Search by town, postcode, slug or type..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={type} onChange={(e) => setType(e.target.value)} options={typeOptions.map((value) => ({ value, label: value === 'all' ? 'All types' : value }))} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions.map((value) => ({ value, label: value === 'all' ? 'All status' : value }))} />
          <Button onClick={() => void load()}><Search size={14} /> Apply</Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Locations</div>
          {loading ? <div className="p-6 text-sm text-textMuted">Loading locations...</div> : null}
          <div className="divide-y divide-white/6">
            {items.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full px-4 py-4 text-left hover:bg-white/[0.04] ${selectedId === item.id ? 'bg-white/[0.06]' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-sm font-semibold text-white">{item.name}</p><p className="mt-1 text-xs text-textMuted">{item.type.replace(/-/g, ' ')} · {item.address?.town || item.name} {item.address?.postcode || ''}</p></div>
                <span className={`rounded-full border px-2.5 py-1 text-xs ${tone(item.readiness?.score)}`}>{item.readiness?.score ?? 0}/100</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-textMuted"><Badge>{item.status}</Badge><Badge>{item.publicPageEnabled ? 'public page' : 'private'}</Badge><Badge>{item.seoPageEnabled ? 'SEO page' : 'no SEO'}</Badge><Badge>{item.googleBusinessEligible ? 'GBP eligible' : 'not GBP eligible'}</Badge></div>
            </button>)}
            {!loading && !items.length ? <div className="p-8 text-center text-sm text-textMuted">No locations yet. Use Seed locations to create Holo Print defaults.</div> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2"><MapPin size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Selected location</h3></div>
            {selected ? <div className="grid gap-3 text-sm">
              <Read label="Name / type" value={`${selected.name} / ${selected.type}`} />
              <Read label="Status" value={selected.status} />
              <Read label="Address" value={[selected.address?.line1, selected.address?.town, selected.address?.county, selected.address?.postcode].filter(Boolean).join(', ') || 'Not set'} />
              <Read label="Cutoff / collection fee" value={`${selected.cutoffTime || '—'} / ${money(selected.collectionFeeMinor)}`} />
              <Read label="Partner fee" value={money(selected.partnerFeeMinor)} />
              <Read label="SEO path" value={selected.seo?.path || 'Not set'} />
              <Read label="SEO schema" value={(selected.seo?.schemaTypes || []).join(', ') || 'Not set'} />
              <Read label="Pickup instructions" value={selected.pickupInstructions || 'Not set'} />
              <Read label="Customer description" value={selected.customerFacingDescription || 'Not set'} />
            </div> : <p className="text-sm text-textMuted">Select a location.</p>}
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Readiness & truth rules</h3>
            {selected ? <div className="space-y-3 text-sm">
              {(selected.readiness?.errors || []).map((item) => <Audit key={item} tone="red" text={item} />)}
              {(selected.readiness?.warnings || []).map((item) => <Audit key={item} tone="amber" text={item} />)}
              {!(selected.readiness?.errors || []).length && !(selected.readiness?.warnings || []).length ? <Audit tone="green" text="No current readiness issues." /> : null}
            </div> : null}
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Build 57 foundation includes</h3>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Main store, owned branch, partner collection point and service-area types.</p>
              <p>Opening hours, collection hours, cutoff times, drop schedule and pickup instructions.</p>
              <p>Allowed/blocked products and collection/partner fees.</p>
              <p>Public page + SEO page flags and automatic SEO record sync.</p>
              <p>Google Business eligibility checks to avoid fake branch SEO.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'green' | 'amber' | 'red' | 'blue' }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : ''; return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 capitalize">{children}</span>; }
function Read({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
function Audit({ tone, text }: { tone: 'red' | 'amber' | 'green'; text: string }) { const Icon = tone === 'green' ? CheckCircle2 : AlertTriangle; const cls = tone === 'green' ? 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10' : tone === 'red' ? 'text-red-200 border-red-500/30 bg-red-500/10' : 'text-amber-200 border-amber-500/30 bg-amber-500/10'; return <div className={`flex gap-2 rounded-xl border p-3 ${cls}`}><Icon size={15} className="mt-0.5 shrink-0" /><span>{text}</span></div>; }
