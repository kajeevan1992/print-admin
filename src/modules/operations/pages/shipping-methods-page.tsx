'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, MapPin, PackageCheck, Search, ShieldAlert, Truck, Warehouse } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { shippingMethodsService } from '@/services/shipping-methods.service';
import type {
  DeliveryFulfilmentMode,
  DeliveryPricingBasis,
  DeliveryTaxClass,
  DeliveryZoneType,
  ShippingMethodChannel,
  ShippingMethodRecord,
  ShippingMethodStatus,
  ShippingRiskBand
} from '@/data/shipping-methods';

const statusOptions: Array<'all' | ShippingMethodStatus> = ['all', 'active', 'pilot', 'paused'];
const channelOptions: Array<'all' | ShippingMethodChannel> = ['all', 'DTC', 'B2B', 'Marketplace', 'Pickup'];
const riskOptions: Array<'all' | ShippingRiskBand> = ['all', 'healthy', 'watch', 'critical'];
const fulfilmentOptions: DeliveryFulfilmentMode[] = ['delivery', 'collection', 'local-courier', 'freight', 'trade-drop-ship'];
const zoneOptions: DeliveryZoneType[] = ['uk-mainland', 'london', 'local-postcodes', 'pickup', 'manual'];
const pricingOptions: DeliveryPricingBasis[] = ['flat', 'free-over-threshold', 'postcode', 'weight', 'manual-quote'];
const taxOptions: DeliveryTaxClass[] = ['standard', 'zero', 'exempt'];

const emptyMethod: ShippingMethodRecord = {
  id: '',
  name: '',
  channel: 'DTC',
  status: 'active',
  risk: 'healthy',
  carrier: '',
  serviceLevel: '',
  cutoffTime: '16:00',
  transitDays: '2-3 days',
  surcharge: 0,
  eligiblePlants: ['Sidcup shop'],
  owner: '',
  notes: '',
  enabled: true,
  showAtCheckout: true,
  publicLabel: '',
  checkoutDescription: '',
  fulfilmentMode: 'delivery',
  zoneType: 'uk-mainland',
  zoneName: 'UK mainland',
  postcodeRules: '',
  pricingBasis: 'flat',
  basePriceMinor: 0,
  freeAboveMinor: undefined,
  minSubtotalMinor: undefined,
  maxSubtotalMinor: undefined,
  maxWeightKg: undefined,
  productionBufferDays: 0,
  sameDayEligible: false,
  nextDayEligible: true,
  requiresManualApproval: false,
  sortOrder: 100,
  taxClass: 'standard'
};

const statusTone: Record<ShippingMethodStatus, string> = {
  active: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  pilot: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  paused: 'border-slate-400/20 bg-slate-400/10 text-slate-200'
};

const riskTone: Record<ShippingRiskBand, string> = {
  healthy: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  watch: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/30 bg-rose-400/10 text-rose-200'
};

function poundsFromMinor(value?: number) {
  return ((Number(value || 0)) / 100).toFixed(2);
}

function minorFromInput(value: string) {
  return Math.round((Number(value) || 0) * 100);
}

function currencyFromMinor(value?: number) {
  return Number(value || 0) === 0 ? 'Free' : `£${poundsFromMinor(value)}`;
}

function surchargeLabel(value: number) {
  return value === 0 ? 'No surcharge' : `+£${value.toFixed(2)}`;
}

function createMethodId(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'delivery-method';
  return `${base}-${Date.now()}`;
}

function prepareForSave(record: ShippingMethodRecord): ShippingMethodRecord {
  return {
    ...record,
    id: record.id || createMethodId(record.name),
    publicLabel: record.publicLabel || record.name,
    checkoutDescription: record.checkoutDescription || record.notes,
    surcharge: Number((record.basePriceMinor / 100).toFixed(2)),
  };
}

function readinessIssues(method: ShippingMethodRecord) {
  const issues: string[] = [];
  if (!method.enabled) issues.push('disabled');
  if (method.showAtCheckout && !method.publicLabel.trim()) issues.push('missing checkout label');
  if (method.showAtCheckout && !method.checkoutDescription.trim()) issues.push('missing checkout description');
  if (method.zoneType !== 'pickup' && !method.postcodeRules.trim()) issues.push('missing postcode/zone rule');
  if (method.pricingBasis === 'free-over-threshold' && !method.freeAboveMinor) issues.push('missing free delivery threshold');
  if (method.risk === 'critical') issues.push('critical carrier/route risk');
  if (method.status === 'paused') issues.push('paused');
  return issues;
}

function ReadinessBadge({ method }: { method: ShippingMethodRecord }) {
  const issues = readinessIssues(method);
  if (!issues.length) {
    return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-200"><CheckCircle2 size={12} /> Checkout ready</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100"><AlertTriangle size={12} /> {issues.length} issue{issues.length === 1 ? '' : 's'}</span>;
}

export function ShippingMethodsPage() {
  const [methods, setMethods] = useState<ShippingMethodRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ShippingMethodStatus>('all');
  const [channel, setChannel] = useState<'all' | ShippingMethodChannel>('all');
  const [risk, setRisk] = useState<'all' | ShippingRiskBand>('all');
  const [editing, setEditing] = useState<ShippingMethodRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await shippingMethodsService.getMethods();
      setMethods(items);
      setSelectedId((current) => current ?? items[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load delivery settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(
    () => methods.filter((item) => {
      const haystack = `${item.name} ${item.publicLabel} ${item.channel} ${item.carrier} ${item.serviceLevel} ${item.owner} ${item.zoneName} ${item.postcodeRules} ${item.eligiblePlants.join(' ')}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesStatus = status === 'all' || item.status === status;
      const matchesChannel = channel === 'all' || item.channel === channel;
      const matchesRisk = risk === 'all' || item.risk === risk;
      return matchesSearch && matchesStatus && matchesChannel && matchesRisk;
    }).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [methods, search, status, channel, risk]
  );

  const selected = rows.find((item) => item.id === selectedId) ?? rows[0] ?? null;

  const kpis = useMemo(() => ({
    enabled: rows.filter((item) => item.enabled).length,
    checkout: rows.filter((item) => item.showAtCheckout && item.enabled).length,
    attention: rows.filter((item) => readinessIssues(item).length > 0).length,
    manual: rows.filter((item) => item.requiresManualApproval || item.pricingBasis === 'manual-quote').length,
    sameDay: rows.filter((item) => item.sameDayEligible).length,
  }), [rows]);

  async function saveMethod(record: ShippingMethodRecord) {
    setSaving(true);
    setError(null);
    setNotice(null);
    const toSave = prepareForSave(record);
    try {
      const saved = await shippingMethodsService.saveMethod(toSave);
      setEditing(null);
      await load();
      setSelectedId(saved.id);
      setNotice(`Saved delivery method: ${saved.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delivery method save failed');
    } finally {
      setSaving(false);
    }
  }

  const createMethod = () => setEditing({ ...emptyMethod, id: '', name: 'New Delivery Method', publicLabel: 'New delivery option' });

  const duplicateMethod = async (record: ShippingMethodRecord) => {
    const copy: ShippingMethodRecord = { ...record, id: createMethodId(`${record.name} Copy`), name: `${record.name} Copy`, publicLabel: `${record.publicLabel || record.name} Copy`, status: 'pilot', sortOrder: record.sortOrder + 1 };
    await saveMethod(copy);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(methods, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'delivery-settings-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const flagged = rows.filter((item) => item.risk !== 'healthy' || readinessIssues(item).length > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Delivery Settings"
        subtitle="Manage checkout delivery methods, collection, local courier zones, UK shipping, cutoffs, pricing, VAT class and manual approval rules using the internal catalog shipping-methods resource."
        actions={<div className="flex flex-wrap gap-2"><Button onClick={() => void load()}>Refresh</Button><Button onClick={exportJson}>Export JSON</Button><Button onClick={async () => { setNotice(null); await shippingMethodsService.seedDefaults(); await load(); setNotice('Default delivery settings seeded.'); }}>Seed defaults</Button><PrimaryButton onClick={createMethod}>Add Delivery Method</PrimaryButton></div>}
      />

      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-5">
        <Card><p className="text-xs text-textMuted">Enabled methods</p><p className="mt-2 text-2xl font-semibold">{kpis.enabled}</p></Card>
        <Card><p className="text-xs text-textMuted">Shown at checkout</p><p className="mt-2 text-2xl font-semibold">{kpis.checkout}</p></Card>
        <Card><p className="text-xs text-textMuted">Needs attention</p><p className="mt-2 text-2xl font-semibold">{kpis.attention}</p></Card>
        <Card><p className="text-xs text-textMuted">Manual approval</p><p className="mt-2 text-2xl font-semibold">{kpis.manual}</p></Card>
        <Card><p className="text-xs text-textMuted">Same-day enabled</p><p className="mt-2 text-2xl font-semibold">{kpis.sameDay}</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
              <Input placeholder="Search method, carrier, postcode, zone..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value as 'all' | ShippingMethodStatus)} />
            <Select options={channelOptions} value={channel} onChange={(e) => setChannel(e.target.value as 'all' | ShippingMethodChannel)} />
            <Select options={riskOptions} value={risk} onChange={(e) => setRisk(e.target.value as 'all' | ShippingRiskBand)} />
          </div>

          {loading ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-textMuted">Loading delivery settings…</div> : null}

          <div className="grid gap-3">
            {rows.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={`rounded-2xl border p-4 text-left transition ${selectedId === item.id ? 'border-accent bg-accent/10' : 'border-white/6 bg-white/[0.02] hover:border-white/15'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <ReadinessBadge method={item} />
                    </div>
                    <p className="mt-1 text-xs text-textMuted">Checkout label: {item.publicLabel || '—'} · {item.carrier} · {item.serviceLevel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone[item.status]}`}>{item.status}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${riskTone[item.risk]}`}>{item.risk}</span>
                    {!item.enabled ? <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[11px] text-red-200">disabled</span> : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-textMuted md:grid-cols-5">
                  <div><span className="text-white">Mode:</span> {item.fulfilmentMode}</div>
                  <div><span className="text-white">Zone:</span> {item.zoneName}</div>
                  <div><span className="text-white">Cutoff:</span> {item.cutoffTime}</div>
                  <div><span className="text-white">Transit:</span> {item.transitDays}</div>
                  <div><span className="text-white">Price:</span> {currencyFromMinor(item.basePriceMinor)}</div>
                </div>
                <div className="mt-2 grid gap-2 text-xs text-textMuted md:grid-cols-4">
                  <div><span className="text-white">Pricing:</span> {item.pricingBasis}</div>
                  <div><span className="text-white">Free over:</span> {item.freeAboveMinor ? currencyFromMinor(item.freeAboveMinor) : '—'}</div>
                  <div><span className="text-white">VAT:</span> {item.taxClass}</div>
                  <div><span className="text-white">Checkout:</span> {item.showAtCheckout ? 'visible' : 'hidden'}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={(e) => { e.stopPropagation(); setEditing(item); }}>Edit</Button>
                  <Button onClick={(e) => { e.stopPropagation(); void duplicateMethod(item); }}>Duplicate</Button>
                  <Button onClick={async (e) => { e.stopPropagation(); await shippingMethodsService.deleteMethod(item.id); await load(); setNotice(`Deleted delivery method: ${item.name}`); }}>Delete</Button>
                  <Button onClick={async (e) => { e.stopPropagation(); await saveMethod({ ...item, enabled: !item.enabled, showAtCheckout: !item.enabled ? item.showAtCheckout : false }); }}>{item.enabled ? 'Disable' : 'Enable'}</Button>
                  {item.status !== 'paused' ? (
                    <Button onClick={async (e) => { e.stopPropagation(); await saveMethod({ ...item, status: 'paused', risk: item.risk === 'healthy' ? 'watch' : item.risk, showAtCheckout: false }); }}>Pause</Button>
                  ) : (
                    <PrimaryButton onClick={async (e) => { e.stopPropagation(); await saveMethod({ ...item, status: 'active', risk: item.risk === 'critical' ? 'watch' : item.risk, enabled: true }); }}>Activate</PrimaryButton>
                  )}
                </div>
              </button>
            ))}
            {!loading && !rows.length ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-textMuted">No delivery methods match the current filters.</div> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Checkout preview</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{selected?.publicLabel || selected?.name || 'No delivery method selected'}</h3>
              <p className="mt-1 text-sm text-textMuted">{selected ? selected.checkoutDescription : 'Choose a delivery method to review customer-facing checkout copy.'}</p>
            </div>
            {selected ? <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Checkout price</p><p className="mt-1 text-sm font-semibold text-white">{currencyFromMinor(selected.basePriceMinor)}</p></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Production buffer</p><p className="mt-1 text-sm font-semibold text-white">{selected.productionBufferDays} day(s)</p></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Dispatch cutoff</p><p className="mt-1 text-sm font-semibold text-white">{selected.cutoffTime}</p></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Legacy surcharge</p><p className="mt-1 text-sm font-semibold text-white">{surchargeLabel(selected.surcharge)}</p></div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Zone / postcode rules</p>
                <p className="mt-2 text-sm leading-6 text-textMuted">{selected.zoneName}: {selected.postcodeRules || 'No postcode rule required.'}</p>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Admin notes</p>
                <p className="mt-2 text-sm leading-6 text-textMuted">{selected.notes}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setEditing(selected)}>Edit method</Button>
                <PrimaryButton onClick={() => void duplicateMethod(selected)}>Clone method</PrimaryButton>
              </div>
            </> : null}
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-white"><ShieldAlert size={16} /> Readiness warnings</div>
            <div className="mt-3 space-y-2 text-sm text-textMuted">
              {flagged.length ? flagged.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{item.name}</span>
                    <span className={`rounded-full border px-2 py-1 text-[10px] uppercase ${riskTone[item.risk]}`}>{item.risk}</span>
                  </div>
                  <p className="mt-1 text-xs text-textMuted">{readinessIssues(item).join(' · ') || item.notes}</p>
                </div>
              )) : <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center">All visible routes are checkout ready.</p>}
            </div>
          </Card>

          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Truck size={16} /> Dispatch logic</div><p className="mt-2 text-sm text-textMuted">Cutoff and production buffer are stored now; checkout resolver can use them later for delivery promises.</p></div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><MapPin size={16} /> Zone matching</div><p className="mt-2 text-sm text-textMuted">Postcode rules are captured in admin first, before connecting customer postcode validation.</p></div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Clock3 size={16} /> Same-day promise</div><p className="mt-2 text-sm text-textMuted">Same-day and next-day flags are separate from production turnaround so they can be combined safely later.</p></div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Warehouse size={16} /> Collection</div><p className="mt-2 text-sm text-textMuted">Collection routes stay in the same delivery settings model, avoiding a duplicate pickup module.</p></div>
            </div>
          </Card>
        </div>
      </div>

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title="Delivery method settings">
        {editing ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted">
              <PackageCheck className="mb-2 text-white" size={18} />
              These settings are admin-facing now and saved to the internal catalog. Hosted checkout can later consume enabled methods that are visible at checkout.
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm"><span className="text-textMuted">Internal name</span><Input placeholder="UK Next-Day Delivery" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Checkout label</span><Input placeholder="Next working day delivery" value={editing.publicLabel} onChange={(e) => setEditing({ ...editing, publicLabel: e.target.value })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Carrier / provider</span><Input placeholder="DPD / DHL / Internal" value={editing.carrier} onChange={(e) => setEditing({ ...editing, carrier: e.target.value })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Service level</span><Input placeholder="Tracked next working day" value={editing.serviceLevel} onChange={(e) => setEditing({ ...editing, serviceLevel: e.target.value })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Channel</span><Select options={channelOptions.filter((o): o is ShippingMethodChannel => o !== 'all')} value={editing.channel} onChange={(e) => setEditing({ ...editing, channel: e.target.value as ShippingMethodChannel })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Fulfilment mode</span><Select options={fulfilmentOptions} value={editing.fulfilmentMode} onChange={(e) => setEditing({ ...editing, fulfilmentMode: e.target.value as DeliveryFulfilmentMode })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Status</span><Select options={statusOptions.filter((o): o is ShippingMethodStatus => o !== 'all')} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as ShippingMethodStatus })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Risk</span><Select options={riskOptions.filter((o): o is ShippingRiskBand => o !== 'all')} value={editing.risk} onChange={(e) => setEditing({ ...editing, risk: e.target.value as ShippingRiskBand })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Zone type</span><Select options={zoneOptions} value={editing.zoneType} onChange={(e) => setEditing({ ...editing, zoneType: e.target.value as DeliveryZoneType })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Zone name</span><Input placeholder="UK mainland / London postcodes" value={editing.zoneName} onChange={(e) => setEditing({ ...editing, zoneName: e.target.value })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Pricing basis</span><Select options={pricingOptions} value={editing.pricingBasis} onChange={(e) => setEditing({ ...editing, pricingBasis: e.target.value as DeliveryPricingBasis })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">VAT class</span><Select options={taxOptions} value={editing.taxClass} onChange={(e) => setEditing({ ...editing, taxClass: e.target.value as DeliveryTaxClass })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Checkout price £</span><Input type="number" step="0.01" value={poundsFromMinor(editing.basePriceMinor)} onChange={(e) => setEditing({ ...editing, basePriceMinor: minorFromInput(e.target.value), surcharge: Number(e.target.value) || 0 })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Free above £</span><Input type="number" step="0.01" value={editing.freeAboveMinor ? poundsFromMinor(editing.freeAboveMinor) : ''} onChange={(e) => setEditing({ ...editing, freeAboveMinor: e.target.value ? minorFromInput(e.target.value) : undefined })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Min subtotal £</span><Input type="number" step="0.01" value={editing.minSubtotalMinor ? poundsFromMinor(editing.minSubtotalMinor) : ''} onChange={(e) => setEditing({ ...editing, minSubtotalMinor: e.target.value ? minorFromInput(e.target.value) : undefined })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Max subtotal £</span><Input type="number" step="0.01" value={editing.maxSubtotalMinor ? poundsFromMinor(editing.maxSubtotalMinor) : ''} onChange={(e) => setEditing({ ...editing, maxSubtotalMinor: e.target.value ? minorFromInput(e.target.value) : undefined })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Max weight kg</span><Input type="number" step="0.1" value={editing.maxWeightKg ?? ''} onChange={(e) => setEditing({ ...editing, maxWeightKg: e.target.value ? Number(e.target.value) : undefined })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Sort order</span><Input type="number" value={String(editing.sortOrder)} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Cutoff time</span><Input placeholder="15:00" value={editing.cutoffTime} onChange={(e) => setEditing({ ...editing, cutoffTime: e.target.value })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Transit promise</span><Input placeholder="Next working day" value={editing.transitDays} onChange={(e) => setEditing({ ...editing, transitDays: e.target.value })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Production buffer days</span><Input type="number" value={String(editing.productionBufferDays)} onChange={(e) => setEditing({ ...editing, productionBufferDays: Number(e.target.value) || 0 })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Owner</span><Input placeholder="Dispatch team" value={editing.owner} onChange={(e) => setEditing({ ...editing, owner: e.target.value })} /></label>
            </div>

            <label className="block space-y-1 text-sm"><span className="text-textMuted">Postcode / zone rules</span><Input placeholder="E*, EC*, SE*, BR*, UK mainland excluding remote zones" value={editing.postcodeRules} onChange={(e) => setEditing({ ...editing, postcodeRules: e.target.value })} /></label>
            <label className="block space-y-1 text-sm"><span className="text-textMuted">Eligible production sites / plants</span><Input placeholder="Sidcup shop, Trade supplier" value={editing.eligiblePlants.join(', ')} onChange={(e) => setEditing({ ...editing, eligiblePlants: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
            <label className="block space-y-1 text-sm"><span className="text-textMuted">Checkout description</span><textarea className="min-h-[90px] w-full rounded-2xl border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none" value={editing.checkoutDescription} onChange={(e) => setEditing({ ...editing, checkoutDescription: e.target.value })} /></label>
            <label className="block space-y-1 text-sm"><span className="text-textMuted">Internal notes</span><textarea className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} /> Enabled</label>
              <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><input type="checkbox" checked={editing.showAtCheckout} onChange={(e) => setEditing({ ...editing, showAtCheckout: e.target.checked })} /> Show at checkout</label>
              <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><input type="checkbox" checked={editing.sameDayEligible} onChange={(e) => setEditing({ ...editing, sameDayEligible: e.target.checked })} /> Same-day eligible</label>
              <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><input type="checkbox" checked={editing.nextDayEligible} onChange={(e) => setEditing({ ...editing, nextDayEligible: e.target.checked })} /> Next-day eligible</label>
              <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><input type="checkbox" checked={editing.requiresManualApproval} onChange={(e) => setEditing({ ...editing, requiresManualApproval: e.target.checked })} /> Requires manual approval</label>
            </div>

            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)} disabled={saving}>Cancel</Button><PrimaryButton onClick={() => saveMethod(editing)} disabled={saving}>{saving ? 'Saving…' : 'Save delivery method'}</PrimaryButton></div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
